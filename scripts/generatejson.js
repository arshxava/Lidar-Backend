// import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";

// dotenv.config();

// const bucketName = process.env.DO_SPACES_BUCKET;
// const region = process.env.DO_SPACES_REGION || "ams3";
// const endpoint = `https://${region}.digitaloceanspaces.com`;

// // DigitalOcean requires region but ignores its actual value
// const s3 = new S3Client({
//   region: "us-east-1", 
//   endpoint,
//   forcePathStyle: false,
//   credentials: {
//     accessKeyId: process.env.DO_SPACES_KEY,
//     secretAccessKey: process.env.DO_SPACES_SECRET,
//   },
// });

// const directoryPath = path.join(process.cwd(), "uploads", "tiles");

// // ✅ Function to list all files in bucket
// const listFiles = async () => {
//   try {
//     const data = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
//     if (data.Contents) {
//       console.log("All files in bucket:", data.Contents.map(f => f.Key));
//     } else {
//       console.log("No files found in bucket.");
//     }
//   } catch (err) {
//     console.error("Error listing files:", err.message);
//   }
// };

// // ✅ Function to upload files
// const uploadFiles = async () => {
//   if (!fs.existsSync(directoryPath)) {
//     console.error("Directory not found:", directoryPath);
//     return;
//   }

//   const files = fs.readdirSync(directoryPath);
//   console.log("Files found locally:", files);

//   for (const file of files) {
//     const filePath = path.join(directoryPath, file);
//     const fileContent = fs.readFileSync(filePath);

//     const params = {
//       Bucket: bucketName,
//       Key: file,
//       Body: fileContent,
//       ACL: "public-read",
//     };

//     try {
//       await s3.send(new PutObjectCommand(params));
//       console.log(`Uploaded: ${file}`);
//     } catch (err) {
//       console.error(`Error uploading ${file}:`, err.message);
//     }
//   }
// };

// // First list files in bucket
// await listFiles();

// // Then upload local files
// await uploadFiles();



import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const bucketName = process.env.DO_SPACES_BUCKET;
const region = process.env.DO_SPACES_REGION || "ams3";
const endpoint = `https://lidar-map-tiles.ams3.digitaloceanspaces.com`;

const s3 = new S3Client({
  region: "us-east-1",
  endpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const localDownloadPath = path.join(process.cwd(), "downloads");
if (!fs.existsSync(localDownloadPath)) fs.mkdirSync(localDownloadPath);

// ✅ Update prefix for new path
const prefix = "lidar-map-tiles/lidar/zips/";

// ✅ List .tar files in new folder
const listTarFiles = async () => {
  try {
    const data = await s3.send(
      new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix })
    );

    const tarFiles = (data.Contents || [])
      .map(f => f.Key)
      .filter(k => k.endsWith(".tar"));

    console.log("Found TAR files:", tarFiles);
    return tarFiles;
  } catch (err) {
    console.error("Error listing .tar files:", err.message);
    return [];
  }
};

// ✅ Download .tar file from new path
const downloadTarFile = async (key) => {
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const data = await s3.send(command);
    const localPath = path.join(localDownloadPath, path.basename(key));

    const stream = fs.createWriteStream(localPath);
    await new Promise((resolve, reject) => {
      data.Body.pipe(stream);
      data.Body.on("error", reject);
      stream.on("finish", resolve);
    });

    console.log(`Downloaded: ${key} → ${localPath}`);
    return localPath;
  } catch (err) {
    console.error(`Error downloading ${key}:`, err.message);
    return null;
  }
};

// ✅ Run: list → download all
const processTarFiles = async () => {
  const tarFiles = await listTarFiles();
  for (const key of tarFiles) {
    await downloadTarFile(key);
  }
};

await processTarFiles();
