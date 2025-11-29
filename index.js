import {
  connectDB,
  getMessagesCollection,
  getUsersCollection,
} from "./db/connectDB.js";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

const PORT = process.env.PORT || 8001;
const rooms = ["general", "food", "laundry", "complains", "inquiry"];

// Initialize Socket.IO after DB connection
async function initSocketServer() {
  try {
    await connectDB();
    console.log("Database connected. Starting Socket.IO...");

    const io = new Server(PORT, {
      cors: {
        origin: [
          "http://127.0.0.1:5500",
          "https://admin.socket.io",
          "http://localhost:5500",
          "http://localhost:5173",
        ],
        credentials: true,
      },
    });

    console.log(`Socket.IO server running on port ${PORT}`);

    setupSocketAuth(io);
    setupSocketEvents(io);

    instrument(io, { auth: false, mode: "development" });
  } catch (err) {
    console.error("Failed to start Socket.IO server:", err);
  }
}

// Authentication Middleware
function setupSocketAuth(io) {
  io.use(async (socket, next) => {
    try {
      const { _id, email } = socket.handshake.auth;

      if (!_id) {
        return next(new Error("Username and password required"));
      }

      const usersCollection = getUsersCollection();

      const user = await usersCollection.findOne({ email: email });

      if (!user) return next(new Error("Invalid login"));
      // console.log(user);
      socket.user = {
        id: user._id,
        username: user.name,
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
    console.log(`User connected: ${socket.user.username}`);

    const usersCollection = getUsersCollection();
    const messagesCollection = getMessagesCollection();

    // Load user's rooms
    const user = await usersCollection.findOne({
      email: socket.user.email,
    });
    if (!user) return;

    socket.emit("roomList", rooms);

    for (const room of rooms) {
      socket.join(room);

      const recentMessages = await messagesCollection
        .find({ roomId: room }) // use correct field name
        .sort({ timestamp: -1 }) // latest first
        .limit(20)
        .toArray();
      // console.log(recentMessages);

      socket.emit("room-messages", {
        room,
        messages: recentMessages.reverse(), // oldest first
      });
    }

    // Handle sending new messages
    socket.on("send", async (data, callback) => {
      try {
        const messageData = {
          text: data.text,
          username: socket.user.username,
          roomId: data.roomId,
          timestamp: new Date(),
        };
        console.log(data.roomId);

        if (!messageData.roomId) {
          throw new Error("Invalid room ID");
        }
        await messagesCollection.insertOne(messageData);

        // socket.to(messageData.roomId).emit("receive", messageData);
        io.emit("receive", messageData);
        console.log("message sent");

        callback({ status: "success" });
      } catch (err) {
        console.error("Send message error:", err);
        callback({ status: "error", message: err.message });
      }
    });

    // Load older messages (pagination)
    socket.on(
      "load-older-messages",
      async ({ roomId, lastMessageTime }, callback) => {
        try {
          const olderMessages = await messagesCollection
            .find({ roomId, timestamp: { $lt: new Date(lastMessageTime) } })
            .toArray();

          callback({ status: "success", roomId, messages: olderMessages });
        } catch (err) {
          callback({ status: "error" });
        }
      }
    );
  });
}

// Start the server
initSocketServer();
