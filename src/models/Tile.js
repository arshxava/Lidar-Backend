const mongoose = require("mongoose");

const tileSchema = new mongoose.Schema({
  map: { type: mongoose.Schema.Types.ObjectId, ref: 'Map' },
  bounds: { type: [Number] }, // [minLon, minLat, maxLon, maxLat]
  status: { type: String, enum: ['available', 'in_progress', 'completed'], default: 'available' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  annotations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Annotation' }],
  submittedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Tile', tileSchema);
