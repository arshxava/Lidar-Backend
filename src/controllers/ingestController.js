// import axios from "axios";
// import fs from "fs-extra";
// import path from "path";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { createExtractorFromFile } from "node-unrar-js";
// import { exec } from "child_process";
// import { v4 as uuidv4 } from "uuid";

// const s3 = new S3Client({
//   region: "ams3",
//   endpoint: "https://ams3.digitaloceanspaces.com",
//   credentials: {
//     accessKeyId: process.env.DO_ACCESS_KEY,
//     secretAccessKey: process.env.DO_SECRET_KEY,
//   },
// });

// function runPdalPipeline(pipelineJson, mapId, tileFile) {
//   return new Promise((resolve, reject) => {
//     const pipelinePath = `/tmp/pipeline-${mapId}-${Date.now()}.json`;
//     fs.writeFileSync(pipelinePath, JSON.stringify(pipelineJson, null, 2));

//     exec(`pdal pipeline "${pipelinePath}"`, (err, stdout, stderr) => {
//       fs.unlinkSync(pipelinePath);
//       if (err) {
//         console.error("PDAL error:", stderr);
//         return reject(err);
//       }
//       console.log(`✅ Created tile: ${tileFile}`);
//       resolve(stdout);
//     });
//   });
// }

// export const ingestAndTile = async (req, res) => {
//   try {
//     const fileUrl = req.query.url;
//     if (!fileUrl) return res.status(400).json({ error: "URL parameter is required" });

//     const mapId = uuidv4();
//     const tempFile = `/tmp/${mapId}.rar`;
//     const extractDir = `/tmp/extracted-${mapId}`;
//     fs.ensureDirSync(extractDir);

//     // 1. Download RAR file
//     console.log("⬇️ Downloading file:", fileUrl);
//     const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
//     fs.writeFileSync(tempFile, response.data);
//     console.log("✅ File downloaded at:", tempFile);

//     // 2. Extract RAR
//     console.log("📦 Extracting RAR...");
//     const extractor = await createExtractorFromFile({ filepath: tempFile });
//     const { files } = extractor.extract({ targetPath: extractDir });

//     if (!files || files.length === 0) {
//       console.log("❌ No files found inside RAR archive");
//       throw new Error("No files found in RAR archive");
//     }

//     console.log("📂 Files extracted:", files.map(f => f.fileHeader.name));

//     // 3. Rename files with no extension → .laz
//     const extractedFiles = fs.readdirSync(extractDir);
//     console.log("📂 Raw files after extraction:", extractedFiles);

//     for (const file of extractedFiles) {
//       const filePath = path.join(extractDir, file);
//       const ext = path.extname(file);
//       if (!ext) {
//         const newPath = `${filePath}.laz`;
//         fs.renameSync(filePath, newPath);
//         console.log(`📝 Renamed ${file} → ${path.basename(newPath)}`);
//       } else {
//         console.log(`ℹ️ Keeping file as is: ${file}`);
//       }
//     }

//     // 4. Check for .laz files
//     const lazFiles = fs.readdirSync(extractDir).filter(f => f.endsWith(".laz"));
//     console.log("🔍 LAZ files found:", lazFiles);

//     if (!lazFiles.length) throw new Error("No .laz files found after extraction");

//     const lazInput = path.join(extractDir, lazFiles[0]);
//     console.log("📌 Using LAZ file for tiling:", lazInput);

//     // 5. Tile generation (10x10 grid)
//     console.log("🧱 Generating 10x10 tiles...");
//     const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
//     const rows = 10, cols = 10;
//     const latStep = (maxLat - minLat) / rows;
//     const lngStep = (maxLng - minLng) / cols;

//     const tileDir = `/tmp/tiles-${mapId}`;
//     fs.ensureDirSync(tileDir);

//     for (let r = 0; r < rows; r++) {
//       for (let c = 0; c < cols; c++) {
//         const tMinLat = minLat + r * latStep;
//         const tMaxLat = minLat + (r + 1) * latStep;
//         const tMinLng = minLng + c * lngStep;
//         const tMaxLng = minLng + (c + 1) * lngStep;

//         const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
//         console.log(`🪓 Creating tile: row=${r}, col=${c}, file=${tileFile}`);

//         const pipelineJson = {
//           pipeline: [
//             lazInput,
//             { type: "filters.crop", bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])` },
//             tileFile
//           ]
//         };

//         await runPdalPipeline(pipelineJson, mapId, tileFile);
//       }
//     }

//     // 6. Upload tiles
//     console.log("☁️ Uploading tiles to DigitalOcean...");
//     const tileFiles = fs.readdirSync(tileDir);
//     for (const file of tileFiles) {
//       const fileData = fs.readFileSync(`${tileDir}/${file}`);
//       console.log(`⬆️ Uploading tile: ${file}`);
//       await s3.send(
//         new PutObjectCommand({
//           Bucket: "lidar-map-tiles",
//           Key: `tiles/${mapId}/${file}`,
//           Body: fileData,
//           ACL: "public-read"
//         })
//       );
//     }

//     console.log("✅ All tiles uploaded!");
//     res.json({ message: "Tiles generated and uploaded successfully!", mapId });

//   } catch (err) {
//     console.error("❌ Error during processing:", err);
//     res.status(500).send("Error processing file");
//   }
// };

// import axios from "axios";
// import fs from "fs";
// import path from "path";
// import * as tar from "tar";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { exec } from "child_process";
// import { v4 as uuidv4 } from "uuid";

// // S3 Client for DigitalOcean Spaces
// const s3 = new S3Client({
//   region: "ams3",
//   endpoint: "https://ams3.digitaloceanspaces.com",
//   credentials: {
//     accessKeyId: process.env.DO_ACCESS_KEY,
//     secretAccessKey: process.env.DO_SECRET_KEY,
//   },
// });

// // ---- Helper: Run PDAL Pipeline for Tiling ----
// const runPdalPipeline = (pipelineJson, tileFile) => {
//   return new Promise((resolve, reject) => {
//     const pipelinePath = `pipeline-${Date.now()}.json`;
//     fs.writeFileSync(pipelinePath, JSON.stringify(pipelineJson, null, 2));

//     exec(`pdal pipeline "${pipelinePath}"`, (err, stdout, stderr) => {
//       fs.unlinkSync(pipelinePath);
//       if (err) return reject(stderr);
//       console.log(`✅ Tile created: ${tileFile}`);
//       resolve(stdout);
//     });
//   });
// };

// // ---- Helper: Upload File to S3 ----
// const uploadToSpaces = async (filePath, key) => {
//   const fileData = fs.readFileSync(filePath);
//   await s3.send(
//     new PutObjectCommand({
//       Bucket: process.env.DO_SPACES_BUCKET,
//       Key: key,
//       Body: fileData,
//       ACL: "public-read",
//     })
//   );
//   console.log(`✅ Uploaded: ${key}`);
// };

// // ---- Controller: Ingest Map & Generate Tiles ----
// export const ingestMap = async (req, res) => {
//   try {
//     const { url, minLat, maxLat, minLng, maxLng } = req.query;
//     if (!url) return res.status(400).json({ msg: "URL required" });

//     const mapId = uuidv4();
//     const tempDir = `/tmp/map-${mapId}`;
//     const tarFile = `${tempDir}/file.tar`;
//     const extractedDir = `${tempDir}/extracted`;
//     const tileOutDir = `${tempDir}/tiles`;

//     fs.mkdirSync(extractedDir, { recursive: true });
//     fs.mkdirSync(tileOutDir, { recursive: true });

//     // 1️⃣ Download TAR file
//     console.log("⬇️ Downloading:", url);
//     const response = await axios.get(url, { responseType: "stream" });
//     await new Promise((resolve, reject) => {
//       const writer = fs.createWriteStream(tarFile);
//       response.data.pipe(writer);
//       writer.on("finish", resolve);
//       writer.on("error", reject);
//     });

//     // 2️⃣ Extract TAR
//     console.log("📦 Extracting TAR...");
//     await tar.x({ file: tarFile, C: extractedDir });

//     // 3️⃣ Find LAZ files
//     const lazFiles = fs.readdirSync(extractedDir).filter(f => f.endsWith(".laz"));
//     if (!lazFiles.length) throw new Error("No .laz files found");
//     const lazInput = path.join(extractedDir, lazFiles[0]);

//     // 4️⃣ Generate 10x10 Tiles
//     console.log("🧱 Generating 10x10 tiles...");
//     const rows = 10, cols = 10;
//     const latStep = (maxLat - minLat) / rows;
//     const lngStep = (maxLng - minLng) / cols;

//     for (let r = 0; r < rows; r++) {
//       for (let c = 0; c < cols; c++) {
//         const tMinLat = parseFloat(minLat) + r * latStep;
//         const tMaxLat = parseFloat(minLat) + (r + 1) * latStep;
//         const tMinLng = parseFloat(minLng) + c * lngStep;
//         const tMaxLng = parseFloat(minLng) + (c + 1) * lngStep;

//         const tileFile = path.join(tileOutDir, `tile_${r}_${c}.laz`);
//         const pipelineJson = {
//           pipeline: [
//             lazInput,
//             { type: "filters.crop", bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])` },
//             tileFile
//           ]
//         };

//         await runPdalPipeline(pipelineJson, tileFile);
//       }
//     }

//     // 5️⃣ Upload Tiles to Spaces
//     console.log("☁️ Uploading tiles...");
//     const tileFiles = fs.readdirSync(tileOutDir);
//     for (const file of tileFiles) {
//       const filePath = path.join(tileOutDir, file);
//       await uploadToSpaces(filePath, `tiles/${mapId}/${file}`);
//     }

//     // Cleanup
//     fs.rmSync(tempDir, { recursive: true, force: true });

//     res.json({ message: "Tiles processed & uploaded!", mapId, tileCount: tileFiles.length });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };


import axios from "axios";
import * as tar from "tar";
import fs from "fs-extra";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { exec } from "child_process";

const s3 = new S3Client({
  region: "ams3",
  endpoint: "https://ams3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

export const ingestFile = async (req, res) => {
  try {
    const fileUrl = req.query.url;
    const mapId = Date.now();
    const tempFile = `/tmp/${mapId}.tar`;
    const extractDir = `/tmp/extracted-${mapId}`;
    const tileDir = `/tmp/tiles-${mapId}`;

    fs.ensureDirSync(extractDir);
    fs.ensureDirSync(tileDir);

    console.log("⬇️ Downloading file:", fileUrl);

    // 1. Download file
    const response = await axios.get(fileUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(tempFile);

    response.data.pipe(writer);

    writer.on("finish", async () => {
      try {
        // 2. Extract TAR file
        console.log("📂 Extracting TAR file...");
        await tar.x({ file: tempFile, C: extractDir });

        // 3. Get all extracted files
        const files = fs.readdirSync(extractDir);

        // 4. Tile slicing logic
        console.log("🧱 Generating 10x10 tiles...");
        const minLat = 0, maxLat = 100, minLng = 0, maxLng = 100;
        const rows = 10, cols = 10;
        const latStep = (maxLat - minLat) / rows;
        const lngStep = (maxLng - minLng) / cols;

        // Function to run PDAL pipeline directly here
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

        for (const file of files) {
          const filePath = path.join(extractDir, file);
          const lazInput = filePath; // Input for PDAL

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const tMinLat = minLat + r * latStep;
              const tMaxLat = minLat + (r + 1) * latStep;
              const tMinLng = minLng + c * lngStep;
              const tMaxLng = minLng + (c + 1) * lngStep;

              const tileFile = path.join(tileDir, `tile_${r}_${c}.laz`);
              console.log(`🪓 Creating tile: row=${r}, col=${c}, file=${tileFile}`);

              const pipelineJson = {
                pipeline: [
                  lazInput,
                  { type: "filters.crop", bounds: `([${tMinLng},${tMaxLng}],[${tMinLat},${tMaxLat}])` },
                  tileFile
                ]
              };

              await runPdalPipeline(pipelineJson, tileFile);
            }
          }
        }

        // 5. Upload each tile to S3
        const tileFiles = fs.readdirSync(tileDir);
        for (const tile of tileFiles) {
          const tilePath = path.join(tileDir, tile);
          const tileData = fs.readFileSync(tilePath);
          await s3.send(
            new PutObjectCommand({
              Bucket: "lidar-map-tiles",
              Key: `tiles/${tile}`,
              Body: tileData,
            })
          );
          console.log(`☁️ Uploaded: ${tile}`);
        }

        res.json({ message: "Tiles processed and uploaded!" });
      } catch (err) {
        console.error(err);
        res.status(500).send("Error processing tiles");
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error ingesting file");
  }
};
