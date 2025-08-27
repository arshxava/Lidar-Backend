const mongoose = require("mongoose");

const tileSchema = new mongoose.Schema(
  {
    map: { type: mongoose.Schema.Types.ObjectId, ref: "Map" },
    projectId:{ type: mongoose.Schema.Types.ObjectId, ref: "projects" },
    imageUrl: { type: String },
    imageName: { type: String },
    bounds: { type: [Number] },
    status: {
      type: String,
      enum: ["available", "in_progress", "completed"],
      default: "available",
    },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  skippedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

annotations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Annotation" }],
  annotatedImageUrl: String,
submittedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tile", tileSchema);
