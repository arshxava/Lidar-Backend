const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const Map = require("../models/Map");
const { uploadMap, getMaps } = require('../controllers/mapController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/maps'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });
router.post('/upload', authMiddleware, upload.single('file'), uploadMap);
router.get('/', authMiddleware, getMaps);
router.get('/:mapId/tiles', authMiddleware, async (req, res) => {
  try {
    const map = await Map.findById(req.params.mapId)
      .populate({
        path: "tiles",
        populate: [
          { path: "annotations", select: "label notes period" },   
          { path: "assignedTo", select: "username email" }        
        ]
      });

    if (!map) {
      return res.status(404).json({ message: "Map not found" });
    }

    res.json(map.tiles);
  } catch (err) {
    console.error("Error fetching tiles:", err);
    res.status(500).json({ message: "Failed to fetch tiles" });
  }
});


module.exports = router;
