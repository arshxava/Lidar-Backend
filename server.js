// ✅ Message Model (src/models/Message.js)
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: String,
  message: String,
  tile: String,
  sender: String,
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

// ✅ Socket Server Entry (e.g. server.js)
const app = require('./app');
// const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./src/models/Message');

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

io.on("connection", (socket) => {
  console.log("🔗 Client connected");

  socket.on("joinRoom", async ({ roomId }) => {
    socket.join(roomId);
    console.log(`👥 Joined room: ${roomId}`);

    try {
      const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
      socket.emit("previousMessages", messages);
    } catch (err) {
      console.error("❌ Fetch failed:", err);
    }
  });

  socket.on("sendMessage", async ({ roomId, message, tile, sender }) => {
    try {
      const chatMessage = new Message({ roomId, message, tile, sender });
      await chatMessage.save();
      io.to(roomId).emit("receiveMessage", chatMessage);
    } catch (err) {
      console.error("❌ Message save failed:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});