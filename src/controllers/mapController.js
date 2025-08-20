// src/controllers/mapController.js
const fs = require("fs");
const path = require("path");
const Map = require("../models/Map");
const Tile = require("../models/Tile");
const s3 = require("../config/doSpaces");
const unzipper = require("unzipper");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const stream = require("stream");
const mime = require("mime-types");
const tar = require("tar");
const axios = require("axios");


// const uploadDirToSpaces = async (dirPath, baseKey) => {
//   const files = fs.readdirSync(dirPath);

//   for (const fileName of files) {
//     const fullPath = path.join(dirPath, fileName);
//     const fileKey = `${baseKey}/${fileName}`;

//     const stats = fs.statSync(fullPath);
//     if (stats.isDirectory()) {
//       await uploadDirToSpaces(fullPath, fileKey); // Recursively upload subdirectories
//     } else {
//       const fileStream = fs.createReadStream(fullPath);
//       const contentType = mime.lookup(fileName) || 'application/octet-stream';

//       await s3.upload({
//         Bucket: process.env.DO_SPACES_BUCKET,
//         Key: fileKey,
//         Body: fileStream,
//         ACL: 'public-read', // Make it public if frontend should access directly
//         ContentType: contentType
//       }).promise();

//       console.log("✅ Uploaded:", fileKey);
//     }
//   }
// };
const uploadWithProgress = (filePath, key, mapId) => {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    let uploadedBytes = 0;

    const fileStream = fs.createReadStream(filePath);

    const upload = s3.upload({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
      Body: fileStream,
      ACL: "public-read",
    });

    upload.on("httpUploadProgress", (progress) => {
      uploadedBytes = progress.loaded;
      const percentage = Math.round((uploadedBytes / fileSize) * 100);
      console.log(`Upload progress for ${mapId}: ${percentage}%`);
    });

    upload.send((err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

function safeParseFloat(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}
const uploadDirToSpaces = async (dirPath, baseKey) => {
  const files = fs.readdirSync(dirPath);
  for (const fileName of files) {
    const fullPath = path.join(dirPath, fileName);
    const fileKey = `${baseKey}/${fileName}`;
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      await uploadDirToSpaces(fullPath, fileKey);
    } else {
      const fileStream = fs.createReadStream(fullPath);
      const contentType = mime.lookup(fileName) || "application/octet-stream";

      await s3
        .upload({
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: fileKey,
          Body: fileStream,
          ACL: "public-read",
          ContentType: contentType,
        })
        .promise();

      console.log("✅ Uploaded:", fileKey);
    }
  }
};
exports.uploadMap = async (req, res) => {
  try {
    const {
      name,
      url,
      minLat = 0,
      maxLat = 0,
      minLng = 0,
      maxLng = 0,
    } = req.body;

    if (!req.file && !url) {
      return res.status(400).json({ msg: "File or URL missing" });
    }

    const bounds = [
      safeParseFloat(minLat),
      safeParseFloat(maxLat),
      safeParseFloat(minLng),
      safeParseFloat(maxLng),
    ];

    if (bounds.some((b) => isNaN(b))) {
      return res.status(400).json({ msg: "Invalid geographic bounds" });
    }

    const mapId = uuidv4();
    console.log("🗺️ Creating new map with ID:", mapId);

    const newMap = await Map.create({
      _id: mapId,
      name,
      bounds,
      uploadedBy: req.user.id,
      status: "uploading",
      progress: 0,
    });

    res.status(202).json({
      msg: "Upload started",
      mapId,
      statusUrl: `/api/maps/status/${mapId}`,
    });

    // Async background processing
    process.nextTick(async () => {
      try {
        let fileBuffer;
        let originalName;

        if (req.file) {
          fileBuffer = req.file.buffer;
          originalName = req.file.originalname;
        } else if (url) {
          console.log("🌐 Downloading map from:", url);

          const response = await axios.get(url, { responseType: "stream" });
          const totalLength = parseInt(response.headers["content-length"], 10);
          let downloaded = 0;
          const chunks = [];

          response.data.on("data", (chunk) => {
            chunks.push(chunk);
            downloaded += chunk.length;
            if (totalLength) {
              const percent = ((downloaded / totalLength) * 100).toFixed(2);
              process.stdout.write(`\r⬇️ Download progress: ${percent}%`);
            } else {
              process.stdout.write(`\r⬇️ Downloaded: ${downloaded} bytes`);
            }
          });

          await new Promise((resolve, reject) => {
            response.data.on("end", resolve);
            response.data.on("error", reject);
          });

          fileBuffer = Buffer.concat(chunks);
          originalName = path.basename(url);
          console.log("\n✅ Downloaded:", originalName);
        }

        const fileExt = path.extname(originalName).toLowerCase();
        const tempDir = `uploads/lidar/temp-${mapId}`;
        fs.mkdirSync(tempDir, { recursive: true });

        let lazInput;

        if (fileExt === ".zip") {
          console.log("📦 Unzipping...");
          const unzipStream = unzipper.Extract({ path: tempDir });
          stream.Readable.from(fileBuffer).pipe(unzipStream);

          await new Promise((resolve, reject) => {
            unzipStream.on("close", resolve);
            unzipStream.on("error", reject);
          });

          const lazFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith(".laz"));
          if (!lazFiles.length) throw new Error("No .laz files found in archive");
          lazInput = path.join(tempDir, lazFiles[0]);
        } else if (fileExt === ".tar") {
          console.log("📦 Extracting TAR...");
          await tar.x({ C: tempDir }, [], stream.Readable.from(fileBuffer));

          const lazFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith(".laz"));
          if (!lazFiles.length) throw new Error("No .laz files found in archive");
          lazInput = path.join(tempDir, lazFiles[0]);
        } else if (fileExt === ".laz") {
          lazInput = path.join(tempDir, originalName);
          fs.writeFileSync(lazInput, fileBuffer);
        } else {
          throw new Error("Unsupported file format. Only .zip, .tar or .laz allowed.");
        }

        // Step 1: Tiling
        await Map.findByIdAndUpdate(mapId, { progress: 50, status: "tiling" });

        const tileOutDir = `uploads/lidar/tiles-${mapId}`;
        fs.mkdirSync(tileOutDir, { recursive: true });

        const tileSize = calculateOptimalTileSize(bounds, 100);
        const pdalCmd = `pdal tile --length=${tileSize} "${lazInput}" "${tileOutDir}/tile_#.laz"`;
        console.log("🧱 Running PDAL:", pdalCmd);

        await new Promise((resolve, reject) => {
          exec(pdalCmd, (err, stdout, stderr) => {
            if (err) return reject(new Error(`PDAL failed: ${stderr}`));
            resolve(stdout);
          });
        });

        await Map.findByIdAndUpdate(mapId, { progress: 75, status: "uploading_tiles" });

        // Step 2: Potree conversion
        const potreeOutputDir = `uploads/lidar/potree-${mapId}`;
        fs.mkdirSync(potreeOutputDir, { recursive: true });

        const potreeCmd = `"C:/Users/Admin/OneDrive/PotreeConverter_windows_x64/PotreeConverter.exe" "${lazInput}" -o "${potreeOutputDir}" --generate-page map-${mapId}`;
        console.log("🖼️ Running PotreeConverter:", potreeCmd);

        await new Promise((resolve, reject) => {
          exec(potreeCmd, (err, stdout, stderr) => {
            if (err) return reject(new Error(`Potree failed: ${stderr}`));
            resolve(stdout);
          });
        });

        await uploadDirToSpaces(potreeOutputDir, `lidar/potree/${mapId}`);
        fs.rmSync(potreeOutputDir, { recursive: true, force: true });

        // Step 3: Upload tiles
        const tileFiles = fs.readdirSync(tileOutDir);
        const tileUploadPromises = tileFiles.map(async (fileName, index) => {
          const tileKey = `lidar/tiles/${mapId}/${fileName}`;
          const tilePath = path.join(tileOutDir, fileName);

          await uploadWithProgress(tilePath, tileKey, mapId);

          return {
            map: mapId,
            bounds: calculateTileBounds(bounds, index, tileFiles.length),
            status: "available",
            imageUrl: `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${tileKey}`,
            imageName: fileName,
          };
        });

        const tiles = await Promise.all(tileUploadPromises);
        const insertedTiles = await Tile.insertMany(tiles);

        const viewerUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/lidar/potree/${mapId}/map-${mapId}.html`;

        await Map.findByIdAndUpdate(mapId, {
          tiles: insertedTiles.map((t) => t._id),
          progress: 100,
          status: "completed",
          tileCount: insertedTiles.length,
          viewerUrl,
        });

        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.rmSync(tileOutDir, { recursive: true, force: true });

        console.log("🎉 Map processing completed:", mapId);
      } catch (err) {
        console.error("❌ Error in processing:", err);
        await Map.findByIdAndUpdate(mapId, {
          status: "failed",
          error: err.message,
        });
      }
    });
  } catch (err) {
    console.error("❌ uploadMap failed:", err);
    res.status(500).json({ msg: "Upload failed", error: err.message });
  }
};


// Get maps by user
exports.getMaps = async (req, res) => {
  try {
    const maps = await Map.find({ uploadedBy: req.user.id }).populate("tiles");
    res.json(maps);
  } catch (err) {
    console.error("❌ getMaps failed:", err);
    res.status(500).json({ msg: "Fetching maps failed" });
  }
};

// Poll map status
exports.getMapStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const map = await Map.findById(id).populate("tiles");

    if (!map) {
      return res.status(404).json({ msg: "Map not found" });
    }

    res.json({
      status: map.status,
      progress: map.progress,
      error: map.error || null,
      viewerUrl: map.viewerUrl || null,
    });
  } catch (err) {
    console.error("❌ getMapStatus failed:", err);
    res.status(500).json({ msg: "Failed to fetch status" });
  }
};


// Helper functions
function calculateOptimalTileSize(bounds, targetTileCount) {
  const [minLat, maxLat, minLng, maxLng] = bounds;

  if (minLat === maxLat || minLng === maxLng) {
    return 1000; // Default 1km tiles
  }

  const area = (maxLat - minLat) * (maxLng - minLng);
  const tileSize = Math.sqrt(area / targetTileCount) * 1000;

  return tileSize > 0 ? tileSize : 1000;
}

// Tile bounds calculation
function calculateTileBounds(mapBounds, tileIndex, totalTiles) {
  const [minLat, maxLat, minLng, maxLng] = mapBounds;
  const cols = Math.ceil(Math.sqrt(totalTiles));
  const row = Math.floor(tileIndex / cols);
  const col = tileIndex % cols;

  const latStep = (maxLat - minLat) / cols;
  const lngStep = (maxLng - minLng) / cols;

  return [
    minLat + row * latStep,
    minLat + (row + 1) * latStep,
    minLng + col * lngStep,
    minLng + (col + 1) * lngStep,
  ];
}
exports.getMaps = async (req, res) => {
  try {
    const maps = await Map.find({ uploadedBy: req.user.id }).populate("tiles");
    res.json(maps);
  } catch (err) {
    console.error("❌ Map fetch failed:", err);
    res.status(500).json({ msg: "Fetching maps failed" });
  }
};
