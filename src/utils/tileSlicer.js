// const sharp = require("sharp");
// const path = require("path");
// const fs = require("fs");
// const s3 = require("./spacesClient");

// const BUCKET = process.env.DO_SPACES_BUCKET;
// const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE;

// async function tileAndUploadToSpaces(rasterBuffer, { mapId, rows, cols }) {
//   const image = sharp(rasterBuffer);
//   const metadata = await image.metadata();

//   const tileWidth = Math.floor(metadata.width / cols);
//   const tileHeight = Math.floor(metadata.height / rows);
//   const tileUrls = [];

//   for (let row = 0; row < rows; row++) {
//     for (let col = 0; col < cols; col++) {
//       const tileName = `tile_${row}_${col}.png`;
//       const tileBuffer = await image
//         .extract({ left: col * tileWidth, top: row * tileHeight, width: tileWidth, height: tileHeight })
//         .png()
//         .toBuffer();

//       const key = `tiles/${mapId}/${tileName}`;
//       await s3.putObject({
//         Bucket: BUCKET,
//         Key: key,
//         Body: tileBuffer,
//         ACL: "public-read",
//         ContentType: "image/png"
//       }).promise();

//       tileUrls.push(`${PUBLIC_BASE}/${key}`);
//     }
//   }
//   return tileUrls;
// }

// module.exports = { tileAndUploadToSpaces };



// // src/utils/tileLazAndUploadToSpaces.js
// // TILES A SINGLE LOCAL .LAZ FILE WITH PDAL, UPLOADS EACH TILE TO DO SPACES, THEN CLEANS UP.

// const fs = require("fs");
// const path = require("path");
// const os = require("os");
// const { spawn } = require("child_process");
// const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// const DO_REGION = process.env.DO_SPACES_REGION; // e.g. "ams3"
// const BUCKET = process.env.DO_SPACES_BUCKET;
// const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE; // e.g. https://lidar-map-tiles.ams3.digitaloceanspaces.com

// // Simple mkdir -p
// function ensureDir(p) {
//   fs.mkdirSync(p, { recursive: true });
// }

// // Spawn PDAL and return when finished
// function runPDALPipeline(pipelinePath) {
//   return new Promise((resolve, reject) => {
//     const pdal = spawn("pdal", ["pipeline", pipelinePath], { stdio: ["ignore", "pipe", "pipe"] });

//     pdal.stdout.on("data", (d) => process.stdout.write(`[PDAL] ${d}`));
//     pdal.stderr.on("data", (d) => process.stderr.write(`[PDAL] ${d}`));

//     pdal.on("close", (code) => {
//       if (code === 0) return resolve();
//       reject(new Error(`PDAL exited with code ${code}`));
//     });
//   });
// }

// /**
//  * Tile a local LAZ file using PDAL and upload tiles to Spaces.
//  *
//  * @param {string} lazLocalPath   Absolute path to the input .laz on disk
//  * @param {object} opts
//  * @param {string} opts.destPrefix    S3 key prefix where tiles will be uploaded (e.g. "lidar-map-tiles/lidar/zips/my-archive/my-laz")
//  * @param {number} [opts.length=1000] Split size (meters) for filters.splitter
//  * @param {boolean} [opts.public=true] Upload with public-read ACL if true
//  * @returns {Promise<{uploadedKeys: string[], uploadedUrls: string[]}>}
//  */
// async function tileAndUploadToSpaces(lazLocalPath, { destPrefix, length = 1000, public: isPublic = true } = {}) {
//   if (!fs.existsSync(lazLocalPath)) {
//     throw new Error(`Input LAZ not found: ${lazLocalPath}`);
//   }
//   if (!destPrefix) {
//     throw new Error(`destPrefix is required (S3 key prefix where tiles will be stored)`);
//   }
//   if (!DO_REGION || !BUCKET) {
//     throw new Error(`Missing DO_SPACES_REGION or DO_SPACES_BUCKET env vars`);
//   }

//   const s3 = new S3Client({
//     region: "us-east-1", // DO accepts any, keep constant
//     endpoint: `https://${DO_REGION}.digitaloceanspaces.com`,
//     credentials: {
//       accessKeyId: process.env.DO_SPACES_KEY,
//       secretAccessKey: process.env.DO_SPACES_SECRET
//     }
//   });

//   // Temp work area
//   const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pdal-"));
//   const tilesDir = path.join(workRoot, "tiles");
//   ensureDir(tilesDir);

//   // Build PDAL pipeline JSON dynamically
//   const pipeline = {
//     pipeline: [
//       {
//         type: "readers.las",
//         filename: lazLocalPath
//       },
//       {
//         // Split the point cloud into grid cells of 'length' meters
//         type: "filters.splitter",
//         length
//       },
//       {
//         type: "writers.las",
//         // PDAL will replace '#' with an incrementing number
//         filename: path.join(tilesDir, "tile_#.laz"),
//         minor_version: 4,
//         compression: "laszip" // keep .laz compressed
//       }
//     ]
//   };

//   const pipelinePath = path.join(workRoot, "pipeline.json");
//   fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2), "utf-8");

//   // Run PDAL tiling
//   await runPDALPipeline(pipelinePath);

//   // Upload each produced tile and delete local file
//   const fileNames = fs.readdirSync(tilesDir).filter(f => f.toLowerCase().endsWith(".laz"));

//   const uploadedKeys = [];
//   const uploadedUrls = [];

//   for (const file of fileNames) {
//     const localTile = path.join(tilesDir, file);
//     const tileKey = `${destPrefix}/${file}`; // same folder structure in Spaces

//     const Body = fs.createReadStream(localTile);
//     await s3.send(new PutObjectCommand({
//       Bucket: BUCKET,
//       Key: tileKey,
//       Body,
//       ACL: isPublic ? "public-read" : "private",
//       ContentType: "application/octet-stream" // LAZ binary
//     }));

//     uploadedKeys.push(tileKey);
//     if (PUBLIC_BASE) {
//       uploadedUrls.push(`${PUBLIC_BASE}/${tileKey}`);
//     }

//     // Remove local tile after successful upload
//     try { fs.unlinkSync(localTile); } catch (_) {}
//   }

//   // Cleanup working dir
//   try { fs.rmSync(workRoot, { recursive: true, force: true }); } catch (_) {}

//   return { uploadedKeys, uploadedUrls };
// }

// module.exports = { tileAndUploadToSpaces };
