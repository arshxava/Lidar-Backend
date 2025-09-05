// import axios from "axios";
// import * as tar from "tar";
// import fs from "fs-extra";
// import path from "path";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { exec } from "child_process";
 
// const s3 = new S3Client({
//   region: "ams3",
//   endpoint: "https://ams3.digitaloceanspaces.com",
//   credentials: {
//     accessKeyId: process.env.DO_SPACES_KEY,
//     secretAccessKey: process.env.DO_SPACES_SECRET,
//   },
// });
 
// export const ingestFile = async (req, res) => {
//   try {
//     const fileUrl = req.query.url;
//     const mapId = Date.now();
//     const tempFile = `/tmp/${mapId}.tar`;
//     const extractDir = `/tmp/extracted-${mapId}`;
//     const tileDir = `/tmp/tiles-${mapId}`;
 
//     fs.ensureDirSync(extractDir);
//     fs.ensureDirSync(tileDir);
 
//     console.log("⬇️ Downloading file:", fileUrl);
 
//     // 1. Download file
//     const response = await axios.get(fileUrl, { responseType: "stream" });
//     const writer = fs.createWriteStream(tempFile);
 
//     response.data.pipe(writer);
 
//     writer.on("finish", async () => {
//       try {
//         // 2. Extract TAR file
//         console.log("📂 Extracting TAR file...");
//         await tar.x({ file: tempFile, C: extractDir });
 
//         // 3. Get all extracted files
//         const files = fs.readdirSync(extractDir);
 
//         // 4. Tile slicing logic
//         console.log("🧱 Generating 10x10 tiles...");
//         const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
//         const rows = 10, cols = 10;
//         const latStep = (maxLat - minLat) / rows;
//         const lngStep = (maxLng - minLng) / cols;
 
//         // Function to run PDAL pipeline directly here
//         const runPdalPipeline = (pipelineJson, tileFile) => {
//           return new Promise((resolve, reject) => {
//             const pipelineFile = `/tmp/pipeline-${Date.now()}.json`;
//             fs.writeFileSync(pipelineFile, JSON.stringify(pipelineJson, null, 2));
 
//             exec(`pdal pipeline ${pipelineFile}`, (err, stdout, stderr) => {
//               if (err) {
//                 console.error(`❌ PDAL Error for ${tileFile}:`, stderr);
//                 return reject(err);
//               }
//               console.log(`✅ Tile created: ${tileFile}`);
//               resolve();
//             });
//           });
//         };
 
//         for (const file of files) {
//           const filePath = path.join(extractDir, file);
//           const lazInput = filePath; // Input for PDAL
 
//           for (let r = 0; r < rows; r++) {
//             for (let c = 0; c < cols; c++) {
//               const tMinLat = minLat + r * latStep;
//               const tMaxLat = minLat + (r + 1) * latStep;
//               const tMinLng = minLng + c * lngStep;
//               const tMaxLng = minLng + (c + 1) * lngStep;
 
//               const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
//               console.log(`🪓 Creating tile: row=${r}, col=${c}, file=${tileFile}`);
 
//               const pipelineJson = {
//                 pipeline: [
//                   lazInput,
//                   { type: "filters.crop", bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])` },
//                   tileFile
//                 ]
//               };
 
//               await runPdalPipeline(pipelineJson, tileFile);
//             }
//           }
//         }
 
//         // 5. Upload each tile to S3
//         const tileFiles = fs.readdirSync(tileDir);
//         for (const tile of tileFiles) {
//           const tilePath = path.join(tileDir, tile);
//           const tileData = fs.readFileSync(tilePath);
//           await s3.send(
//             new PutObjectCommand({
//               Bucket: "lidar-map-tiles",
//               Key: `tiles/${tile}`,
//               Body: tileData,
//             })
//           );
//           console.log(`☁️ Uploaded: ${tile}`);
//         }
 
//         res.json({ message: "Tiles processed and uploaded!" });
//       } catch (err) {
//         console.error(err);
//         res.status(500).send("Error processing tiles");
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error ingesting file");
//   }
// };




// import axios from "axios";
// import * as tar from "tar";
// import fs from "fs-extra";
// import path from "path";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { exec } from "child_process";
// import Map from "../models/Map.js";
// import Tile from "../models/Tile.js";

// const s3 = new S3Client({
//   region: "ams3",
//   endpoint: "https://ams3.digitaloceanspaces.com",
//   credentials: {
//     accessKeyId: process.env.DO_SPACES_KEY,
//     secretAccessKey: process.env.DO_SPACES_SECRET,
//   },
// });

// export const ingestFile = async (req, res) => {
//   try {
//     const { name, url } = req.body;
//     const mapId = Date.now().toString();

//     // 1. Create Map entry in DB (status = processing)
//     const mapDoc = await Map.create({
//       name,
//       url,
//       status: "processing",
//       createdAt: new Date(),
//     });

//     const tempFile = `/tmp/${mapId}.tar`;
//     const extractDir = `/tmp/extracted-${mapId}`;
//     const tileDir = `/tmp/tiles-${mapId}`;
//     const potreeOutDir = `/tmp/potree-${mapId}`;
//     fs.ensureDirSync(extractDir);
//     fs.ensureDirSync(tileDir);
//     fs.ensureDirSync(potreeOutDir);

//     console.log("⬇️ Downloading file:", url);

//     // Download TAR file
//     const response = await axios.get(url, { responseType: "stream" });
//     const writer = fs.createWriteStream(tempFile);

//     response.data.pipe(writer);

//     writer.on("finish", async () => {
//       try {
//         console.log("📂 Extracting TAR file...");
//         await tar.x({ file: tempFile, C: extractDir });

//         const files = fs.readdirSync(extractDir);

//         // Tile slicing params
//         const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
//         const rows = 10, cols = 10;
//         const latStep = (maxLat - minLat) / rows;
//         const lngStep = (maxLng - minLng) / cols;

//         const runPdalPipeline = (pipelineJson, tileFile) => {
//           return new Promise((resolve, reject) => {
//             const pipelineFile = `/tmp/pipeline-${Date.now()}.json`;
//             fs.writeFileSync(pipelineFile, JSON.stringify(pipelineJson, null, 2));

//             exec(`pdal pipeline ${pipelineFile}`, (err, stdout, stderr) => {
//               if (err) {
//                 console.error(`❌ PDAL Error for ${tileFile}:`, stderr);
//                 return reject(err);
//               }
//               console.log(`✅ Tile created: ${tileFile}`);
//               resolve();
//             });
//           });
//         };

//         const tileDocs = [];

//         for (const file of files) {
//           const filePath = path.join(extractDir, file);

//           for (let r = 0; r < rows; r++) {
//             for (let c = 0; c < cols; c++) {
//               const tMinLat = minLat + r * latStep;
//               const tMaxLat = minLat + (r + 1) * latStep;
//               const tMinLng = minLng + c * lngStep;
//               const tMaxLng = minLng + (c + 1) * lngStep;

//               const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
//               console.log(`🪓 Creating tile: row=${r}, col=${c}, file=${tileFile}`);

//               const pipelineJson = {
//                 pipeline: [
//                   filePath,
//                   { type: "filters.crop", bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])` },
//                   tileFile,
//                 ],
//               };

//               await runPdalPipeline(pipelineJson, tileFile);

//               // Upload tile to S3
//               const tileKey = `tiles/${mapId}/tile_${r}_${c}.laz`;
//               const tileData = fs.readFileSync(tileFile);

//               await s3.send(
//                 new PutObjectCommand({
//                   Bucket: "lidar-map-tiles",
//                   Key: tileKey,
//                   Body: tileData,
//                 })
//               );

//               console.log(`☁️ Uploaded: ${tileKey}`);

//               // Save tile metadata
//               tileDocs.push({
//                 mapId: mapDoc._id,
//                 row: r,
//                 col: c,
//                 s3Key: tileKey,
//                 s3Url: `https://lidar-map-tiles.ams3.digitaloceanspaces.com/${tileKey}`,
//                 bounds: { minLat: tMinLat, maxLat: tMaxLat, minLng: tMinLng, maxLng: tMaxLng },
//               });
//             }
//           }
//         }

//         await Tile.insertMany(tileDocs);

//         // 6. Run PotreeConverter on tileDir
//         console.log("🔄 Running PotreeConverter...");
//         exec(`PotreeConverter ${tileDir} -o ${potreeOutDir} --generate-page map_${mapId}`, async (err, stdout, stderr) => {
//           if (err) {
//             console.error("❌ Potree conversion failed:", stderr);
//             mapDoc.status = "failed";
//             await mapDoc.save();
//             return res.status(500).send("Potree conversion failed");
//           }

//           console.log("✅ Potree conversion completed:", stdout);

//           // Upload Potree output to S3
//           const uploadDir = async (localDir, remotePrefix) => {
//             const files = fs.readdirSync(localDir);
//             for (const file of files) {
//               const filePath = path.join(localDir, file);
//               const stat = fs.statSync(filePath);
//               if (stat.isDirectory()) {
//                 await uploadDir(filePath, `${remotePrefix}/${file}`);
//               } else {
//                 const fileData = fs.readFileSync(filePath);
//                 const s3Key = `${remotePrefix}/${file}`;
//                 await s3.send(
//                   new PutObjectCommand({
//                     Bucket: "lidar-map-tiles",
//                     Key: s3Key,
//                     Body: fileData,
//                   })
//                 );
//                 console.log(`☁️ Uploaded Potree file: ${s3Key}`);
//               }
//             }
//           };

//           await uploadDir(potreeOutDir, `potree/${mapId}`);

//           // Save Potree URL in Map document
//           mapDoc.status = "completed";
//           mapDoc.potreeUrl = `https://lidar-map-tiles.ams3.digitaloceanspaces.com/potree/${mapId}/cloud.js`;
//           await mapDoc.save();

//           res.json({
//             message: "Tiles + Potree processed, uploaded, and stored in DB!",
//             mapId: mapDoc._id,
//             potreeUrl: mapDoc.potreeUrl,
//             tiles: tileDocs.map((t) => t.s3Url),
//           });
//         });
//       } catch (err) {
//         console.error(err);
//         mapDoc.status = "failed";
//         await mapDoc.save();
//         res.status(500).send("Error processing tiles");
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error ingesting file");
//   }
// };

// import { Worker } from "worker_threads";

// export const ingestFile = async (req, res) => {
//   try {
//     const fileUrl = req.query.url;  // ?url=...
//     const mapId = Date.now();

//     const worker = new Worker(new URL("../workers/tileWorker.js", import.meta.url), {
//       workerData: { fileUrl, mapId },
//     });

//     worker.on("message", (msg) => console.log("Worker finished:", msg));
//     worker.on("error", (err) => console.error("Worker error:", err));
//     worker.on("exit", (code) => console.log("Worker exited:", code));

//     // instant response
//     res.status(200).json({ message: "Processing started", jobId: mapId });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


import { Worker } from "worker_threads";
import Map from "../models/Map.js";
import path from "path";

export const ingestFile = async (req, res) => {
  try {
    const { name, description, fileUrl, tileSizeKm, projectId } = req.body;

    // Save Map entry immediately
    const map = await Map.create({
      name,
      description,
      fileUrl,
      tileSizeKm,
      projectId,
      // uploadedBy: req.user._id,
    });

    // Spawn worker
    const worker = new Worker(new URL("../workers/tileWorker.js", import.meta.url), {
      workerData: { fileUrl, mapId: map._id.toString(), tileSizeKm, projectId },
    });

    worker.on("message", (msg) => console.log("Worker finished:", msg));
    worker.on("error", (err) => console.error("Worker error:", err));
    worker.on("exit", (code) => console.log("Worker exited:", code));

    res.status(200).json({ message: "Processing started", mapId: map._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
