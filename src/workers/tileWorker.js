// // tileWorker.js
// import { parentPort, workerData } from "worker_threads";
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

// async function processFile(fileUrl, mapId) {
//   try {
//     const tempFile = `/tmp/${mapId}.tar`;
//     const extractDir = `/tmp/extracted-${mapId}`;
//     const tileDir = `/tmp/tiles-${mapId}`;

//     fs.ensureDirSync(extractDir);
//     fs.ensureDirSync(tileDir);

//     console.log("⬇️ Downloading file:", fileUrl);

//     // Download
//     const response = await axios.get(fileUrl, { responseType: "stream" });
//     await new Promise((resolve, reject) => {
//       const writer = fs.createWriteStream(tempFile);
//       response.data.pipe(writer);
//       writer.on("finish", resolve);
//       writer.on("error", reject);
//     });

//     // Extract
//     console.log("📂 Extracting TAR file...");
//     await tar.x({ file: tempFile, C: extractDir });

//     // Files
//     const files = fs.readdirSync(extractDir);

//     console.log("🧱 Generating 10x10 tiles...");
//     const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
//     const rows = 10, cols = 10;
//     const latStep = (maxLat - minLat) / rows;
//     const lngStep = (maxLng - minLng) / cols;

//     const runPdalPipeline = (pipelineJson, tileFile) => {
//       return new Promise((resolve, reject) => {
//         const pipelineFile = `/tmp/pipeline-${Date.now()}.json`;
//         fs.writeFileSync(pipelineFile, JSON.stringify(pipelineJson, null, 2));

//         exec(`pdal pipeline ${pipelineFile}`, (err, stdout, stderr) => {
//           if (err) {
//             console.error(`❌ PDAL Error for ${tileFile}:`, stderr);
//             return reject(err);
//           }
//           console.log(`✅ Tile created: ${tileFile}`);
//           resolve();
//         });
//       });
//     };

//     for (const file of files) {
//       const lazInput = path.join(extractDir, file);

//       for (let r = 0; r < rows; r++) {
//         for (let c = 0; c < cols; c++) {
//           const tMinLat = minLat + r * latStep;
//           const tMaxLat = minLat + (r + 1) * latStep;
//           const tMinLng = minLng + c * lngStep;
//           const tMaxLng = minLng + (c + 1) * lngStep;

//           const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
//           console.log(`🪓 Creating tile: row=${r}, col=${c}`);

//           const pipelineJson = {
//             pipeline: [
//               lazInput,
//               {
//                 type: "filters.crop",
//                 bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])`,
//               },
//               tileFile,
//             ],
//           };

//           await runPdalPipeline(pipelineJson, tileFile);
//         }
//       }
//     }

//     // Upload to S3
//     const tileFiles = fs.readdirSync(tileDir);
//     for (const tile of tileFiles) {
//       const tilePath = path.join(tileDir, tile);
//       const tileData = fs.readFileSync(tilePath);
//       await s3.send(
//         new PutObjectCommand({
//           Bucket: "lidar-map-tiles",
//           Key: `tiles/${tile}`,
//           Body: tileData,
//         })
//       );
//       console.log(`☁️ Uploaded: ${tile}`);
//     }

//     parentPort.postMessage({ success: true, message: "Tiles processed and uploaded!" });
//   } catch (err) {
//     console.error(err);
//     parentPort.postMessage({ success: false, error: err.message });
//   }
// }

// processFile(workerData.fileUrl, workerData.mapId);


// import { parentPort, workerData } from "worker_threads";
// import axios from "axios";
// import * as tar from "tar";
// import fs from "fs-extra";
// import path from "path";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { exec } from "child_process";
// import mongoose from "mongoose";
// import Map from "../models/Map.js";
// import Tile from "../models/Tile.js";

// await mongoose.connect(process.env.MONGO_URI);

// const s3 = new S3Client({
//   region: "ams3",
//   endpoint: "https://ams3.digitaloceanspaces.com",
//   credentials: {
//     accessKeyId: process.env.DO_SPACES_KEY,
//     secretAccessKey: process.env.DO_SPACES_SECRET,
//   },
// });

// async function processFile(fileUrl, mapId, tileSizeKm, projectId) {
//   try {
//     const tempFile = `/tmp/${mapId}.tar`;
//     const extractDir = `/tmp/extracted-${mapId}`;
//     const tileDir = `/tmp/tiles-${mapId}`;

//     fs.ensureDirSync(extractDir);
//     fs.ensureDirSync(tileDir);

//     // Download
//     console.log("⬇️ Downloading file:", fileUrl);
//     const response = await axios.get(fileUrl, { responseType: "stream" });
//     await new Promise((resolve, reject) => {
//       const writer = fs.createWriteStream(tempFile);
//       response.data.pipe(writer);
//       writer.on("finish", resolve);
//       writer.on("error", reject);
//     });

//     // Extract
//     console.log("📂 Extracting TAR file...");
//     await tar.x({ file: tempFile, C: extractDir });

//     const files = fs.readdirSync(extractDir);

//     // Example bounding box
//     const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
//     const rows = 10, cols = 10;
//     const latStep = (maxLat - minLat) / rows;
//     const lngStep = (maxLng - minLng) / cols;

//     const runPdalPipeline = (pipelineJson, tileFile) => {
//       return new Promise((resolve, reject) => {
//         const pipelineFile = `/tmp/pipeline-${Date.now()}.json`;
//         fs.writeFileSync(pipelineFile, JSON.stringify(pipelineJson, null, 2));

//         exec(`pdal pipeline ${pipelineFile}`, (err, stdout, stderr) => {
//           if (err) {
//             console.error(`❌ PDAL Error for ${tileFile}:`, stderr);
//             return reject(err);
//           }
//           console.log(`✅ Tile created: ${tileFile}`);
//           resolve();
//         });
//       });
//     };

//     // Generate tiles
//     for (const file of files) {
//       const lazInput = path.join(extractDir, file);

//       for (let r = 0; r < rows; r++) {
//         for (let c = 0; c < cols; c++) {
//           const tMinLat = minLat + r * latStep;
//           const tMaxLat = minLat + (r + 1) * latStep;
//           const tMinLng = minLng + c * lngStep;
//           const tMaxLng = minLng + (c + 1) * lngStep;

//           const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
//           console.log(`🪓 Creating tile: row=${r}, col=${c}`);

//           const pipelineJson = {
//             pipeline: [
//               lazInput,
//               {
//                 type: "filters.crop",
//                 bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])`,
//               },
//               tileFile,
//             ],
//           };

//           await runPdalPipeline(pipelineJson, tileFile);

//           // Upload to S3
//           const tileData = fs.readFileSync(tileFile);
//           const key = `tiles/${mapId}/tile_${r}_${c}.laz`;
//           await s3.send(
//             new PutObjectCommand({
//               Bucket: "lidar-map-tiles",
//               Key: key,
//               Body: tileData,
//             })
//           );

//           const url = `https://lidar-map-tiles.ams3.digitaloceanspaces.com/${key}`;

//           // Save to MongoDB
//           const tile = await Tile.create({
//             map: mapId,
//             projectId,
//             imageUrl: url,
//             imageName: `tile_${r}_${c}.laz`,
//             bounds: [tMinLat, tMaxLat, tMinLng, tMaxLng],
//           });

//           await Map.findByIdAndUpdate(mapId, { $push: { tiles: tile._id } });
//         }
//       }
//     }

//     parentPort.postMessage({ success: true, message: "Tiles processed, uploaded, and saved to DB!" });
//   } catch (err) {
//     console.error(err);
//     parentPort.postMessage({ success: false, error: err.message });
//   } finally {
//     mongoose.connection.close();
//   }
// }

// processFile(workerData.fileUrl, workerData.mapId, workerData.tileSizeKm, workerData.projectId);


import { parentPort, workerData } from "worker_threads";
import axios from "axios";
import * as tar from "tar";
import fs from "fs-extra";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { exec } from "child_process";
import mongoose from "mongoose";
import Map from "../models/Map.js";
import Tile from "../models/Tile.js";

await mongoose.connect(process.env.MONGO_URI);

const s3 = new S3Client({
  region: "ams3",
  endpoint: "https://ams3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

async function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Command failed:", cmd, stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function uploadDirToS3(localDir, s3Prefix) {
  const files = fs.readdirSync(localDir, { withFileTypes: true });
  for (const f of files) {
    const fullPath = path.join(localDir, f.name);
    if (f.isDirectory()) {
      await uploadDirToS3(fullPath, `${s3Prefix}/${f.name}`);
    } else {
      const fileData = fs.readFileSync(fullPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: "lidar-map-tiles",
          Key: `${s3Prefix}/${f.name}`,
          Body: fileData,
        })
      );
    }
  }
}

async function processFile(fileUrl, mapId, tileSizeKm, projectId) {
  try {
    const tempFile = `/tmp/${mapId}.tar`;
    const extractDir = `/tmp/extracted-${mapId}`;
    const tileDir = `/tmp/tiles-${mapId}`;
    const potreeMapDir = `/tmp/potree-map-${mapId}`;

    fs.ensureDirSync(extractDir);
    fs.ensureDirSync(tileDir);
    fs.ensureDirSync(potreeMapDir);

    // Download
    console.log("⬇️ Downloading file:", fileUrl);
    const response = await axios.get(fileUrl, { responseType: "stream" });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Extract
    console.log("📂 Extracting TAR file...");
    await tar.x({ file: tempFile, C: extractDir });

    const files = fs.readdirSync(extractDir);

    // Example bounding box
    const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
    const rows = 10, cols = 10;
    const latStep = (maxLat - minLat) / rows;
    const lngStep = (maxLng - minLng) / cols;

    const runPdalPipeline = (pipelineJson, tileFile) => {
      return new Promise((resolve, reject) => {
        const pipelineFile = `/tmp/pipeline-${Date.now()}.json`;
        fs.writeFileSync(pipelineFile, JSON.stringify(pipelineJson, null, 2));

        exec(`pdal pipeline ${pipelineFile}`, (err, stdout, stderr) => {
          if (err) {
            console.error(`❌ PDAL Error for ${tileFile}:`, stderr);
            return reject(err);
          }
          console.log(`✅ Tile created: ${tileFile}`);
          resolve();
        });
      });
    };

    // === 📌 Generate Tiles + Potree per tile ===
    for (const file of files) {
      const lazInput = path.join(extractDir, file);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tMinLat = minLat + r * latStep;
          const tMaxLat = minLat + (r + 1) * latStep;
          const tMinLng = minLng + c * lngStep;
          const tMaxLng = minLng + (c + 1) * lngStep;

          const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
          console.log(`🪓 Creating tile: row=${r}, col=${c}`);

          const pipelineJson = {
            pipeline: [
              lazInput,
              {
                type: "filters.crop",
                bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])`,
              },
              tileFile,
            ],
          };

          await runPdalPipeline(pipelineJson, tileFile);

          // Upload tile LAZ
          const tileData = fs.readFileSync(tileFile);
          const key = `tiles/${mapId}/tile_${r}_${c}.laz`;
          await s3.send(
            new PutObjectCommand({
              Bucket: "lidar-map-tiles",
              Key: key,
              Body: tileData,
            })
          );

          const url = `https://lidar-map-tiles.ams3.digitaloceanspaces.com/${key}`;

          // === 📌 Convert this tile to Potree ===
          const tilePotreeDir = `/tmp/potree-tile-${mapId}-${r}-${c}`;
          fs.ensureDirSync(tilePotreeDir);

          await runCommand(`PotreeConverter ${tileFile} -o ${tilePotreeDir} --generate-page tile_${r}_${c}`);

          await uploadDirToS3(tilePotreeDir, `potree/tiles/${mapId}/tile_${r}_${c}`);

          const potreeUrl = `https://lidar-map-tiles.ams3.digitaloceanspaces.com/potree/tiles/${mapId}/tile_${r}_${c}/tile_${r}_${c}.html`;

          // Save to MongoDB
          const tile = await Tile.create({
            map: mapId,
            projectId,
            imageUrl: url,
            potreeUrl,
            imageName: `tile_${r}_${c}.laz`,
            bounds: [tMinLat, tMaxLat, tMinLng, tMaxLng],
          });

          await Map.findByIdAndUpdate(mapId, { $push: { tiles: tile._id } });
        }
      }
    }

    // === 📌 Convert full map to Potree ===
    console.log("🌍 Generating Potree for full map...");
    for (const file of files) {
      if (file.endsWith(".laz")) {
        const lazInput = path.join(extractDir, file);
        await runCommand(`PotreeConverter ${lazInput} -o ${potreeMapDir} --generate-page map_${mapId}`);
      }
    }
    await uploadDirToS3(potreeMapDir, `potree/maps/${mapId}`);
    const potreeMapUrl = `https://lidar-map-tiles.ams3.digitaloceanspaces.com/potree/maps/${mapId}/map_${mapId}.html`;

    await Map.findByIdAndUpdate(mapId, { potreeUrl: potreeMapUrl });

    parentPort.postMessage({ success: true, message: "Tiles + Potree processed, uploaded, and saved to DB!" });
  } catch (err) {
    console.error(err);
    parentPort.postMessage({ success: false, error: err.message });
  } finally {
    mongoose.connection.close();
  }
}

processFile(workerData.fileUrl, workerData.mapId, workerData.tileSizeKm, workerData.projectId);
