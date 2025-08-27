// src/models/Map.js

const mongoose = require("mongoose");

const mapSchema = new mongoose.Schema({
  name: String,
  fileUrl: String,
  projectId: String,
  bounds: { type: [Number] }, 
  tileSizeKm: Number,
  projectId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tile' }],
  tiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tile' }],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } 
}, { timestamps: true });

module.exports = mongoose.model('Map', mapSchema);
