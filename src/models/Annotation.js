const mongoose = require("mongoose");

const annotationSchema = new mongoose.Schema({
  tileId: { type: mongoose.Schema.Types.ObjectId, ref: "Tile" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: String, 
  data: mongoose.Schema.Types.Mixed,
  label: String,
  notes: String,
  period: {
    type: String,
    enum: [
      "Neolithic or before",
      "Bronze Age",
      "Iron Age",
      "Roman",
      "Medieval",
      "Modern",
      "No idea"
    ],
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Annotation", annotationSchema);
