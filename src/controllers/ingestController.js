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
