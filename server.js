// ✅ Message Model (src/models/Message.js)
const mongoose = require('mongoose');
const { processAllRawMaps } = require('./src/utils/processSpaceMap'); // ✅ Import your processing function

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
// const { Server } = require('socket.io');
const Message = require('./src/models/Message');

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {  // ✅ make this async
    console.log("✅ MongoDB connected");

    console.log("🚀 Server started: processing existing raw maps...");
    // await processAllRawMaps();  // ✅ now await works here
    console.log("✅ Initial processing completed.");

    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

