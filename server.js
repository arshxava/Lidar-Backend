const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./src/models/Message'); // ✅ Import message model

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Socket.IO
io.on("connection", (socket) => {
  console.log("🔗 New client connected");

  socket.on("joinRoom", async ({ roomId }) => {
    socket.join(roomId);
    console.log(`👥 User joined room: ${roomId}`);

    // ✅ Fetch previous messages from DB
    try {
      const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
      socket.emit("previousMessages", messages);
    } catch (err) {
      console.error("❌ Failed to fetch previous messages:", err);
    }
  });

  socket.on("sendMessage", async ({ roomId, message, tile, sender }) => {
    console.log("📩 Message received:", { roomId, message, sender, tile });

    try {
      const chatMessage = new Message({ roomId, message, tile, sender });
      await chatMessage.save();

      io.to(roomId).emit("receiveMessage", chatMessage);
    } catch (err) {
      console.error("❌ Failed to save message:", err);
    }
  });

  socket.on("clearChat", async ({ roomId }) => {
    console.log("🧹 Clearing chat for room:", roomId);

    try {
      await Message.deleteMany({ roomId });
      io.to(roomId).emit("clearChat");
    } catch (err) {
      console.error("❌ Failed to clear chat:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});
