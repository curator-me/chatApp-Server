import { connectDB, getMessagesCollection, getUsersCollection } from "./db/connectDB.js";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

const PORT = process.env.PORT || 8000;

// Initialize Socket.IO after DB connection
async function initSocketServer() {
  try {
    await connectDB();
    console.log("✅ Database connected. Starting Socket.IO...");

    const io = new Server(PORT, {
      cors: {
        origin: [
          "http://127.0.0.1:5500",
          "https://admin.socket.io",
          "http://localhost:5500",
        ],
        credentials: true,
      },
    });

    console.log(`🚀 Socket.IO server running on port ${PORT}`);

    setupSocketAuth(io);
    setupSocketEvents(io);

    instrument(io, { auth: false, mode: "development" });
  } catch (err) {
    console.error("❌ Failed to start Socket.IO server:", err);
  }
}

// Authentication Middleware
function setupSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const { username, password } = socket.handshake.auth;

      if (!username || !password) {
        return next(new Error("Username and password required"));
      }

      const usersCollection = getUsersCollection();
      const user = await usersCollection.findOne({ username, password });

      if (!user) return next(new Error("Invalid login"));

      socket.user = {
        id: user._id,
        username: user.username,
        email: user.email,
      };

      next();
    } catch (err) {
      console.error("Auth error:", err);
      next(new Error("Authentication error"));
    }
  });
}

// Event Handlers
function setupSocketEvents(io) {
  io.on("connection", async (socket) => {
    console.log(`✅ User connected: ${socket.user.username}`);

    const usersCollection = getUsersCollection();
    const messagesCollection = getMessagesCollection();

    // Load user's rooms
    const user = await usersCollection.findOne({
      username: socket.user.username,
    });
    if (!user) return;

    socket.emit("roomList", user.rooms || []);

    for (const room of user.rooms || []) {
      socket.join(room);

      const recentMessages = await messagesCollection
        .find({ roomid: room })
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray();

      socket.emit("room-messages", {
        room,
        messages: recentMessages.reverse(),
      });
    }

    // Handle sending new messages
    socket.on("send", async (data, callback) => {
      try {
        const messageData = {
          text: data.text,
          username: socket.user.username,
          roomid: data.roomid,
          timestamp: new Date(),
        };

        if (!messageData.roomid || messageData.roomid === "notice") {
          throw new Error("Invalid room ID");
        }

        await messagesCollection.insertOne(messageData);
        socket.to(data.roomid).emit("receive", messageData);

        callback({ status: "success" });
      } catch (err) {
        callback({ status: "error" });
      }
    });

    // Load older messages (pagination)
    socket.on(
      "load-older-messages",
      async ({ roomid, lastMessageTime }, callback) => {
        try {
          const olderMessages = await messagesCollection
            .find({ roomid, timestamp: { $lt: new Date(lastMessageTime) } })
            .sort({ timestamp: 1 })
            .limit(20)
            .toArray();

          callback({ status: "success", roomid, messages: olderMessages });
        } catch (err) {
          callback({ status: "error" });
        }
      }
    );
  });
}

// Start the server
initSocketServer();
