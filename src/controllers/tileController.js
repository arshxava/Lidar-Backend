// src/controllers/tileController.js

const Tile = require("../models/Tile");
const Annotation = require("../models/Annotation");
const fs = require("fs");

const assignTile = async (req, res) => {

  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const existingTile = await Tile.findOne({ assignedTo: userId, status: 'in_progress' });
    if (existingTile) {
      return res.status(200).json(existingTile);
    }

    const newTile = await Tile.findOneAndUpdate(
      {
        status: 'available',
        assignedTo: null,
        skippedBy: { $ne: userId }, // exclude previously skipped tiles
      },
      {
        assignedTo: userId,
        assignedAt: new Date(),
        status: 'in_progress',
      },
      { new: true }
    );


    if (!newTile) {
      return res.status(404).json({ message: "No available tiles" });
    }

    res.status(200).json(newTile);
  } catch (err) {
    // console.error("🔥 Error in assignTile:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const skipTile = async (req, res) => {
  const { tileId } = req.params;
  const userId = req.user?.id || req.user?._id;

  // console.log("📩 Skip request received for tile:", tileId);
  // console.log("👤 User:", userId);

  try {
    const tile = await Tile.findById(tileId);

    if (!tile) {
      return res.status(404).json({ message: "Tile not found" });
    }

    // Mark the tile as available again
    tile.status = "available";
    tile.assignedTo = null;
    tile.assignedAt = null;

    // Safely reset annotations field
    tile.annotations = undefined; // 👈 fix: don't assign empty array to ObjectId field

    // Add user to skippedBy
    if (!tile.skippedBy.includes(userId)) {
      tile.skippedBy.push(userId);
    }

    await tile.save();

    // console.log("✅ Tile marked as skipped and made available");
    res.status(200).json({ message: "Tile skipped" });
  } catch (err) {
    // console.error("🔥 Skip tile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const completeTile = async (req, res) => {
  console.log("🚀 completeTile API called");

  const { tileId } = req.params;
const { annotationIds, submittedBy, annotationMeta = {} } = req.body;


  console.log("📝 tileId:", tileId);
  console.log("📝 annotationIds:", annotationIds);
  console.log("📝 submittedBy:", submittedBy);

  if (!annotationIds || !Array.isArray(annotationIds) || annotationIds.length === 0) {
    return res.status(400).json({ message: "Annotation IDs are required" });
  }

  try {
    const tile = await Tile.findById(tileId);
    if (!tile) {
      return res.status(404).json({ message: "Tile not found" });
    }

    console.log("✅ Tile found:", tile);

    // 🔍 Fetch saved annotations by IDs
    const savedAnnotations = await Annotation.find({ _id: { $in: annotationIds } });

    if (!savedAnnotations.length) {
      return res.status(400).json({ message: "No valid annotations found" });
    }

    console.log("✅ Retrieved annotations:", savedAnnotations.map(a => a._id));

    const formattedAnnotations = annotations.map((a) => {
  const meta = annotationMeta[a._id?.toString()] || {};
  return {
    type: a.type,
    points:
      a.type === "polygon"
        ? a.data?.points || []
        : a.type === "point"
        ? [{ x: a.data?.pixelX, y: a.data?.pixelY }]
        : [],
    label: meta.label || a.label || "",
    notes: meta.notes || a.notes || "",
    period: meta.period || a.period || "",
  };
});


console.log("🧾 formattedAnnotations for canvas:", formattedAnnotations);

    const path = require("path");
    const originalPath = path.join(process.cwd(), "uploads", "tiles", tile.imageName.trim());
    const generateAnnotatedImage = require("../utils/generatedAnnotatedImage");

    const annotatedImageUrl = await generateAnnotatedImage(tileId, formattedAnnotations, originalPath);

    tile.status = "completed";
    tile.submittedAt = new Date();
    tile.submittedBy = submittedBy || null;
    tile.annotations = savedAnnotations.map(a => a._id);
    tile.annotatedImageUrl = annotatedImageUrl;

    await tile.save();

    // 🔗 Optional: Update annotations with the generated image URL
    await Annotation.updateMany(
      { _id: { $in: annotationIds } },
      { $set: { annotatedimageUrl: annotatedImageUrl } }
    );

    console.log("✅ Tile and annotations updated");

    res.status(200).json({ message: "Tile marked complete", tile });
  } catch (err) {
    console.error("❌ Tile submission error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


module.exports = { assignTile, skipTile, completeTile };
