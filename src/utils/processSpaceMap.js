// // processSpacesMapStream.js
// const AWS = require("aws-sdk");
// const tar = require("tar-stream");
// const sharp = require("sharp");
// const streamifier = require("streamifier");
// const Map = require("../models/Map");
// const Tile = require("../models/Tile");
// const { tileAndUploadToSpaces } = require("./tileSlicer");

// const BUCKET = process.env.DO_SPACES_BUCKET;
// const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE;

// const s3 = new AWS.S3({
//   endpoint: `${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
//   accessKeyId: process.env.DO_SPACES_KEY,
//   secretAccessKey: process.env.DO_SPACES_SECRET
// });

// // Utility: List all .tar files under lidar/zips/
// async function listTarFiles() {
//   const list = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: "lidar/zips/" }).promise();
//   return list.Contents.filter(f => f.Key.endsWith(".tar")).map(f => f.Key);
// }

// async function processOneRawMap(archiveKey) {
//   if (!archiveKey || typeof archiveKey !== "string") {
//     console.error("❌ processOneRawMap called with invalid archiveKey:", archiveKey);
//     return;
//   }

//   // base file name without .tar
//   const base = archiveKey.replace(/^.*\//, "").replace(/\.(tar)$/i, "");
//   // metadata JSON next to .tar file
//   const metaKey = `lidar/zips/${base}.json`;

//   // Check if metadata JSON exists
//   try {
//     await s3.headObject({ Bucket: BUCKET, Key: metaKey }).promise();
//   } catch {
//     console.error(`❌ Metadata missing for ${archiveKey}, expected at ${metaKey}`);
//     return;
//   }

//   // Read metadata
//   let meta;
//   try {
//     const metaData = await s3.getObject({ Bucket: BUCKET, Key: metaKey }).promise();
//     meta = JSON.parse(metaData.Body.toString());
//   } catch (err) {
//     console.error(`❌ Failed to read metadata for ${archiveKey}:`, err.message);
//     return;
//   }

//   const { name, bounds, tileSizeKm = 10, projectId, adminId } = meta;

//   // Create map entry in DB
//   const newMap = await Map.create({
//     name,
//     fileUrl: `${PUBLIC_BASE}/${archiveKey}`,
//     bounds,
//     tileSizeKm,
//     uploadedBy: adminId,
//     project: projectId
//   });

//   // Prepare tar extraction
//   const tarStream = tar.extract();
//   const rasterChunks = [];

//   tarStream.on("entry", async (header, stream, next) => {
//     if (/\.(tif|tiff|png|jpg|jpeg)$/i.test(header.name)) {
//       console.log(`🖼 Found raster: ${header.name}`);
//       stream.on("data", chunk => rasterChunks.push(chunk));
//       stream.on("end", next);
//     } else {
//       stream.resume();
//       next();
//     }
//   });

//   // Stream .tar file from Spaces
//   try {
//     const s3Stream = s3.getObject({ Bucket: BUCKET, Key: archiveKey }).createReadStream();
//     s3Stream.pipe(tarStream);

//     await new Promise((resolve, reject) => {
//       tarStream.on("finish", resolve);
//       tarStream.on("error", reject);
//     });
//   } catch (err) {
//     console.error(`❌ Failed to extract ${archiveKey}:`, err.message);
//     return;
//   }

//   if (!rasterChunks.length) {
//     console.error(`❌ No raster images found inside ${archiveKey}`);
//     return;
//   }

//   // Slice into tiles & upload
//   const rasterBuffer = Buffer.concat(rasterChunks);
//   const { tiles: tileBounds, rows, cols } = sliceMap(bounds, tileSizeKm);

//   let tileUrls;
//   try {
//     tileUrls = await tileAndUploadToSpaces(rasterBuffer, { mapId: newMap._id, rows, cols });
//   } catch (err) {
//     console.error(`❌ Failed to tile and upload for ${archiveKey}:`, err.message);
//     return;
//   }

//   // Save tiles in DB
//   const allTiles = tileBounds.map((b, i) => ({
//     map: newMap._id,
//     bounds: b,
//     status: "available",
//     imageUrl: tileUrls[i],
//     imageName: tileUrls[i].split("/").pop(),
//     row: Math.floor(i / cols),
//     col: i % cols
//   }));

//   try {
//     const insertedTiles = await Tile.insertMany(allTiles);
//     newMap.tiles = insertedTiles.map(t => t._id);
//     await newMap.save();
//     console.log(`✅ Processed ${archiveKey} → ${insertedTiles.length} tiles.`);
//   } catch (err) {
//     console.error(`❌ Failed to save tiles for ${archiveKey}:`, err.message);
//   }
// }

// // Process all tar files in lidar/zips
// async function processAllRawMaps() {
//   const tarFiles = await listTarFiles();
//   for (const file of tarFiles) {
//     await processOneRawMap(file);
//   }
// }

// module.exports = { processOneRawMap, processAllRawMaps };


const { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const tar = require("tar-stream");
const sharp = require("sharp");
const streamifier = require("streamifier");
const Map = require("../models/Map");
const Tile = require("../models/Tile");
const { tileAndUploadToSpaces } = require("./tileSlicer");

const BUCKET = process.env.DO_SPACES_BUCKET;
const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE;

// ✅ AWS SDK v3 S3 Client
const s3 = new S3Client({
  region: "us-east-1", // DigitalOcean requires any region value
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
  }
});

// ✅ List all .tar files in bucket
async function listTarFiles() {
  const prefix = "lidar-map-tiles/lidar/zips/";
  const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  return (data.Contents || [])
    .filter(f => f.Key.endsWith(".tar"))
    .map(f => f.Key);
}

async function processOneRawMap(archiveKey) {
  if (!archiveKey || typeof archiveKey !== "string") {
    console.error("❌ processOneRawMap called with invalid archiveKey:", archiveKey);
    return;
  }

  const base = archiveKey.replace(/^.*\//, "").replace(/\.(tar)$/i, "");
  const metaKey = `lidar-map-tiles/lidar/zips/${base}.json`;

  // ✅ Check metadata JSON exists
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: metaKey }));
  } catch {
    console.error(`❌ Metadata missing for ${archiveKey}, expected at ${metaKey}`);
    return;
  }

  // ✅ Read metadata JSON
  let meta;
  try {
    const metaData = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: metaKey }));
    const body = await streamToString(metaData.Body);
    meta = JSON.parse(body);
  } catch (err) {
    console.error(`❌ Failed to read metadata for ${archiveKey}:`, err.message);
    return;
  }

  const { name, bounds, tileSizeKm = 10, projectId, adminId } = meta;

  // ✅ Create map entry in DB
  const newMap = await Map.create({
    name,
    fileUrl: `${PUBLIC_BASE}/${archiveKey}`,
    bounds,
    tileSizeKm,
    uploadedBy: adminId,
    project: projectId
  });

  // ✅ Extract raster images from tar
  const tarStream = tar.extract();
  const rasterChunks = [];

  tarStream.on("entry", async (header, stream, next) => {
    if (/\.(tif|tiff|png|jpg|jpeg)$/i.test(header.name)) {
      console.log(`🖼 Found raster: ${header.name}`);
      stream.on("data", chunk => rasterChunks.push(chunk));
      stream.on("end", next);
    } else {
      stream.resume();
      next();
    }
  });

  // ✅ Stream tar from S3
  try {
    const tarFile = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: archiveKey }));
    tarFile.Body.pipe(tarStream);

    await new Promise((resolve, reject) => {
      tarStream.on("finish", resolve);
      tarStream.on("error", reject);
    });
  } catch (err) {
    console.error(`❌ Failed to extract ${archiveKey}:`, err.message);
    return;
  }

  if (!rasterChunks.length) {
    console.error(`❌ No raster images found inside ${archiveKey}`);
    return;
  }

  // ✅ Slice map into tiles
  const rasterBuffer = Buffer.concat(rasterChunks);
  const { tiles: tileBounds, rows, cols } = sliceMap(bounds, tileSizeKm);

  let tileUrls;
  try {
    tileUrls = await tileAndUploadToSpaces(rasterBuffer, { mapId: newMap._id, rows, cols });
  } catch (err) {
    console.error(`❌ Failed to tile and upload for ${archiveKey}:`, err.message);
    return;
  }

  // ✅ Save tiles to DB
  const allTiles = tileBounds.map((b, i) => ({
    map: newMap._id,
    bounds: b,
    status: "available",
    imageUrl: tileUrls[i],
    imageName: tileUrls[i].split("/").pop(),
    row: Math.floor(i / cols),
    col: i % cols
  }));

  try {
    const insertedTiles = await Tile.insertMany(allTiles);
    newMap.tiles = insertedTiles.map(t => t._id);
    await newMap.save();
    console.log(`✅ Processed ${archiveKey} → ${insertedTiles.length} tiles.`);
  } catch (err) {
    console.error(`❌ Failed to save tiles for ${archiveKey}:`, err.message);
  }
}

// ✅ Process all tar files
async function processAllRawMaps() {
  const tarFiles = await listTarFiles();
  for (const file of tarFiles) {
    await processOneRawMap(file);
  }
}

// ✅ Helper: Convert S3 stream to string
async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
}

module.exports = { processOneRawMap, processAllRawMaps };
