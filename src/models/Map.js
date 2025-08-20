// // src/models/Map.js

// const mongoose = require("mongoose");

// const mapSchema = new mongoose.Schema({
//   name: String,
//   fileUrl: String,
//   bounds: { type: [Number] }, 
//   tileSizeKm: Number,
//   tiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tile' }],
//   uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } 
// }, { timestamps: true });

// module.exports = mongoose.model('Map', mapSchema);
const mongoose = require("mongoose");

const mapSchema = new mongoose.Schema({
  _id: {
    type: String, // ✅ This allows UUIDs as _id
  },
  name: String,
  viewerUrl: String,
  fileUrl: String,
  bounds: { type: [Number] }, 
  tileSizeKm: Number,
  tiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tile' }],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } 
}, { timestamps: true });

module.exports = mongoose.model('Map', mapSchema);
