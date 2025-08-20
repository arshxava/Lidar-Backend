// src/routes/mapRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const Map = require("../models/Map");
const { uploadMap, getMaps, deleteMap } = require('../controllers/mapController');
const Tile = require('../models/Tile');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/maps'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });
router.post('/upload', authMiddleware, upload.single('file'), uploadMap);
router.get('/', authMiddleware, getMaps);
// Delete a map (and its tiles)
router.delete('/:mapId', authMiddleware, deleteMap);

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
      console.log(`🧩 Tile #${i}`);
      console.log("→ assignedTo:", tile.assignedTo);
      console.log("→ annotations:", tile.annotations);
    });

    res.json(tiles);
  } catch (err) {
    console.error("Error fetching tiles:", err);
    res.status(500).json({ message: "Failed to fetch tiles" });
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