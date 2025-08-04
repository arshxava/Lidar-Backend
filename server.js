const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Adjust for your frontend
    methods: ["GET", "POST"]
  }
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));

const chatRooms = {}; // { roomId: [ { message, tile, sender } ] }

io.on("connection", (socket) => {
  console.log("🔗 New client connected");

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log(`👥 User joined room: ${roomId}`);

    if (chatRooms[roomId]) {
      socket.emit("previousMessages", chatRooms[roomId]);
    }
  });

  socket.on("sendMessage", ({ roomId, message, tile, sender }) => {
    console.log("📩 Message received:", { roomId, message, sender, tile });

    const chatMessage = { message, tile, sender };
    if (!chatRooms[roomId]) chatRooms[roomId] = [];
    chatRooms[roomId].push(chatMessage);

    io.to(roomId).emit("receiveMessage", chatMessage);
  });

  socket.on("clearChat", ({ roomId }) => {
    console.log("🧹 Clearing chat for room:", roomId);
    chatRooms[roomId] = [];
    io.to(roomId).emit("clearChat");
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});
