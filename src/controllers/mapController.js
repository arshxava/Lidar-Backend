// src/controllers/mapController.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Map = require("../models/Map");
const Tile = require("../models/Tile");
const { sliceMap } = require("../utils/tileSlicer");
const cloudinary = require("../config/cloudinary"); 

const generateTileImages = async (imagePath, outputDir, mapId, rows, cols) => {
  const fixedWidth = 1024;
  const fixedHeight = 1024;

  const tileWidth = Math.floor(fixedWidth / cols);
  const tileHeight = Math.floor(fixedHeight / rows);

  // Check if the image exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Input image not found at path: ${imagePath}`);
  }

  // Resize the image
  const resizedImageBuffer = await sharp(imagePath)
    .resize(fixedWidth, fixedHeight)
    .toBuffer();

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const imageUrls = [];
  let tileIndex = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * tileWidth;
      const top = row * tileHeight;
      const width = col === cols - 1 ? fixedWidth - left : tileWidth;
      const height = row === rows - 1 ? fixedHeight - top : tileHeight;

      const tileFileName = `${mapId}_tile_${tileIndex}.png`;
      const tilePath = path.join(outputDir, tileFileName);

      try {
        // Extract tile from buffer and save to file
        await sharp(resizedImageBuffer)
          .extract({ left, top, width, height })
          .toFile(tilePath);

        // console.log(`🖼️ Tile ${tileIndex} saved locally → ${tilePath}`);

        // Upload tile to Cloudinary
        const tileCloudRes = await cloudinary.uploader.upload(tilePath, {
          folder: "tiles",
          public_id: `${mapId}_tile_${tileIndex}`,
          resource_type: "image",
        });

        // console.log(`☁️ Tile ${tileIndex} uploaded to Cloudinary → ${tileCloudRes.secure_url}`);

        imageUrls.push(tileCloudRes.secure_url);
      } catch (err) {
        // console.error(`❌ Tile ${tileIndex} failed to process: ${err.message}`);
        imageUrls.push(null);
      }

      tileIndex++;
    }
  }

  return imageUrls;
};
exports.uploadMap = async (req, res) => {
  try {
    const { name, minLat, maxLat, minLng, maxLng, tileSizeKm = 10 } = req.body;
    const file = req.file;

    if (!file) {
      // console.warn("❌ No file in request.");
      return res.status(400).json({ msg: "File missing" });
    }

    const bounds = [
      parseFloat(minLat),
      parseFloat(maxLat),
      parseFloat(minLng),
      parseFloat(maxLng),
    ];

    if (bounds.some((val) => isNaN(val))) {
      // console.warn("❌ Invalid lat/lng values:", bounds);
      return res.status(400).json({ msg: "Invalid lat/lng" });
    }

    // const fileUrl = `/uploads/maps/${file.filename}`;
    const cloudinaryRes = await cloudinary.uploader.upload(file.path, {
      folder: "maps",
      public_id: `${Date.now()}-map`,
      resource_type: "image",
    });
    const fileUrl = cloudinaryRes.secure_url;

 
    const imagePath =  file.path;


    const newMap = await Map.create({
      name,
      fileUrl,
      bounds,
      tileSizeKm,
      uploadedBy: req.user.id 
    });

    const { tiles: tileBounds, rows, cols } = sliceMap(bounds, tileSizeKm);
    

    const tileImages = await generateTileImages(
      imagePath,
      "uploads/tiles",
      newMap._id,
      rows,
      cols
    );
// console.log("🧩 Tile Images:", tileImages); 

    tileImages.forEach((url, index) => {
        // console.log(`🧷 Tile ${index} filename:`, url?.split("/").pop());

    });

    const allTiles = tileBounds.map((bounds, i) => ({
      map: newMap._id,
      bounds,
      status: "available",
      assignedTo: null,
      imageUrl: tileImages[i] || null,
      imageName: tileImages[i]?.split("/").pop()?.trim() || null,
    }));

    allTiles.forEach((tile, index) => {
      // console.log("🧱 Tile image file:", tileImages[index], "🧱 Clean name:", tileImages[index]?.split("/").pop()?.trim());

    });

    const insertedTiles = await Tile.insertMany(allTiles);
// console.log("📦 Tiles to insert:", allTiles);

    newMap.tiles = insertedTiles.map((tile) => tile._id);
    await newMap.save();

    res.status(201).json({
      msg: "Map uploaded and sliced successfully",
      name: newMap.name,
      tilesCreated: insertedTiles.length,
    });
  } catch (err) {
    res.status(500).json({ msg: "Upload failed", error: err.message });
  }
};

exports.getMaps = async (req, res) => {
  try {
    const maps = await Map.find({ uploadedBy: req.user.id }).populate("tiles");
    res.json(maps);
  } catch (err) {
    console.error("❌ Map fetch failed:", err);
    res.status(500).json({ msg: "Fetching maps failed" });
  }
};
exports.deleteMap = async (req, res) => {
  try {
    const { mapId } = req.params;
    console.log("🗑️ Delete request received for mapId:", mapId);

    // Find map
    const map = await Map.findById(mapId).populate("tiles");
    if (!map) {
      console.warn("❌ Map not found:", mapId);
      return res.status(404).json({ msg: "Map not found" });
    }
    console.log("✅ Map found:", map.name || map._id);

    // Ensure user is the uploader (authorization check)
    if (map.uploadedBy.toString() !== req.user.id) {
      console.warn(
        `⚠️ Unauthorized delete attempt by user ${req.user.id} for map ${mapId}`
      );
      return res
        .status(403)
        .json({ msg: "Not authorized to delete this map" });
    }
    console.log("🔐 User authorized:", req.user.id);

    // Delete all tiles in DB
    const deletedTiles = await Tile.deleteMany({ map: mapId });
    console.log(`🧱 Deleted ${deletedTiles.deletedCount} tiles from DB`);

    // Delete map record
    await Map.findByIdAndDelete(mapId);
    console.log("🗺️ Map deleted from DB:", mapId);

    // OPTIONAL: also remove files from Cloudinary
    try {
      // Delete map image
      if (map.fileUrl) {
        const publicId = map.fileUrl.split("/").pop().split(".")[0];
        console.log("☁️ Deleting map image from Cloudinary:", publicId);
        await cloudinary.uploader.destroy(`maps/${publicId}`);
      }

      // Delete tiles images
      for (const tile of map.tiles) {
        if (tile.imageName) {
          const tileId = tile.imageName.split(".")[0];
          console.log("☁️ Deleting tile image from Cloudinary:", tileId);
          await cloudinary.uploader.destroy(`tiles/${tileId}`);
        }
      }
    } catch (err) {
      console.warn("⚠️ Cloudinary cleanup failed:", err.message);
    }

    console.log("✅ Map and tiles fully deleted:", mapId);
    res.json({ msg: "Map and its tiles deleted successfully" });
  } catch (err) {
    console.error("❌ Delete map failed:", err);
    res.status(500).json({ msg: "Failed to delete map", error: err.message });
  }
};
