// src/routes/mapRoutes.js
const express = require('express');
const router = express.Router();
// const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const Map = require("../models/Map");
const { uploadMap, getMaps } = require('../controllers/mapController');
const Tile = require('../models/Tile');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authMiddleware, upload.single('file'), uploadMap);
router.get('/', authMiddleware, getMaps);


router.get('/:mapId/tiles', authMiddleware, async (req, res) => {
  try {
    const map = await Map.findById(req.params.mapId);
    if (!map) {
      return res.status(404).json({ message: "Map not found" });
    }

    const tiles = await Tile.find({ map: map._id })
      .populate("annotations", "label notes period")
      .populate("assignedTo", "username email");

    // Debug: Check populated data
    tiles.forEach((tile, i) => {
      // console.log(`🧩 Tile #${i}`);
      // console.log("→ assignedTo:", tile.assignedTo);
      // console.log("→ annotations:", tile.annotations);
    });

    res.json(tiles);
  } catch (err) {
    console.error("Error fetching tiles:", err);
    res.status(500).json({ message: "Failed to fetch tiles" });
  }
});

// Add to your routes
router.get('/test-spaces', async (req, res) => {
  try {
    const data = await s3.listObjectsV2({
      Bucket: process.env.DO_SPACES_BUCKET,
      MaxKeys: 1
    }).promise();
    
    res.json({
      success: true,
      message: `Connected to bucket ${process.env.DO_SPACES_BUCKET}`,
      firstObject: data.Contents[0]?.Key || 'No objects found'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      config: {
        bucket: process.env.DO_SPACES_BUCKET,
        endpoint: process.env.DO_SPACES_ENDPOINT,
        region: process.env.DO_SPACES_ENDPOINT?.split('.')[0]
      }
    });
  }
});
module.exports = router;


// router.get('/:mapId/tiles', authMiddleware, async (req, res) => {
//   try {
//     const map = await Map.findById(req.params.mapId)
//       .populate({
//         path: "tiles",
//         populate: [
//           { path: "annotations", select: "label notes period" },
//           { path: "assignedTo", select: "username email" }
//         ]
//       });

//     if (!map) {
//       return res.status(404).json({ message: "Map not found" });
//     }

//     // 🔍 Debug: Check if tiles are populated
//     map.tiles.forEach((tile, i) => {
//       console.log(`🧩 Tile #${i}:`);
//       console.log("→ assignedTo:", tile.assignedTo);
//       console.log("→ annotations:", tile.annotations);
//     });

//     res.json(map.tiles);
//   } catch (err) {
//     console.error("Error fetching tiles:", err);
//     res.status(500).json({ message: "Failed to fetch tiles" });
//   }
// });