const {
  connectDB,
  getMessagesCollection,
  getUsersCollection,
} = require("./db");

console.log("Socket.IO server running on port 8000");

connectDB().then(() => {
  console.log("Database ready, starting Socket.IO...");

  const { instrument } = require("@socket.io/admin-ui");
  const io = require("socket.io")(8000, {
    cors: {
      origin: [
        "http://127.0.0.1:5500",
        "https://admin.socket.io",
        "http://localhost:5500",
      ],
      credentials: true,
    },
  });

  const users = {};

  io.use(async (socket, next) => {
    try {
      const { username, password } = socket.handshake.auth;

      if (!username || !password) {
        return next(new Error("Username and password required"));
      }

      const usersCollection = getUsersCollection();
      // console.log("here");
      // Find the user in MongoDB
      const user = await usersCollection.findOne({ username, password });
      // console.log(user);
      if (!user) {
        return next(new Error("Invalid login"));
      }
      console.log("user found");

      // Attach user info to the socket (so you can use it later)
      socket.user = {
        id: user._id,
        username: user.username,
        email: user.email,
      };

      next(); // ✅ allow connection
    } catch (err) {
      console.error("Auth error:", err);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("✅ User connected:", socket.user.username);

    // const roomList = getRoomCollection();

    const usersCollection = getUsersCollection();
    const messagesCollection = getMessagesCollection();

    // Load user from DB (to get room list)
    const user = await usersCollection.findOne({
      username: socket.user.username,
    });

    socket.emit("roomList", user.rooms);

    // if (!user) return;

    // Join all rooms the user belongs to
    for (const room of user.rooms) {
      socket.join(room);

      // Fetch last 20 messages from this room
      const recentMessages = await messagesCollection
        .find({ roomid: room })
        .sort({ timestamp: -1 }) // newest
        .limit(20)
        .toArray();

      // Send them in chronological order
      socket.emit("room-messages", {
        room,
        messages: recentMessages.reverse(), // reverse so oldest → newest
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
        if (messageData.roomid === null) throw new Error("room id is null");
        if (messageData.roomid === "notice")
          throw new Error("You are not allowed to send message");

        await messagesCollection.insertOne(messageData);

        socket.to(data.roomid).emit("receive", messageData);

        callback({ status: "success" });
      } catch (err) {
        console.error("Message save error:", err);
        callback({ status: "error" });
      }
    });

    // Pagination request (load older messages)
    socket.on(
      "load-older-messages",
      async ({ roomid, lastMessageTime }, callback) => {
        try {
          // console.log(lastMessageTime);
          const olderMessages = await messagesCollection
            .find({ roomid, timestamp: { $lt: new Date(lastMessageTime) } })
            .sort({ timestamp: 1 })
            .limit(20)
            .toArray();
// console.log(olderMessages);
          callback({
            status: "success",
            roomid: roomid,
            messages: olderMessages,
          });
        } catch (err) {
          console.error("Pagination error:", err);
          callback({ status: "error" });
        }
      }
    );
  });

  instrument(io, { auth: false, mode: "development" });
});
