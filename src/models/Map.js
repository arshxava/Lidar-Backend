// src/models/Map.js

const mongoose = require("mongoose");

const mapSchema = new mongoose.Schema({
  name: String,
  fileUrl: String,
  viewerUrl: { type: String },
  // bounds: { type: [Number] }, 
  tileSizeKm: Number,
  tiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tile' }],
  projectId:{ type: mongoose.Schema.Types.ObjectId, ref: 'proejcts', required: true } ,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User'} 
}, { timestamps: true });

module.exports = mongoose.model('Map', mapSchema);
