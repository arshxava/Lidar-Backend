// // const cron = require('node-cron');
// // const s3 = require('./spacesClient');
// // const fs = require('fs');
// // const { processAllRawMaps } = require('./processSpaceMap'); // ✅ Import updated function

// // cron.schedule('* * * * * *', async () => {
// //   console.log('⏳ Cron: scanning lidar/zips/ for new uploads...');
  
// //   // ✅ Process all tar files automatically
// //   await processAllRawMaps();

// //   // ✅ Backup logic stays as-is
// //   try {
// //     const fileName = 'backup.json';
// //     const fileContent = fs.readFileSync(`./backups/${fileName}`);

// //     await s3.putObject({
// //       Bucket: process.env.DO_SPACES_BUCKET,
// //       Key: fileName,
// //       Body: fileContent,
// //       ACL: 'private'
// //     }).promise();

// //     console.log('Backup uploaded successfully!');
// //   } catch (err) {
// //     console.error('Error uploading backup:', err);
// //   }
// // });


// const cron = require("node-cron");

// async function scanAndProcess() {
//   const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }));
//   const tarFiles = (data.Contents || [])
//     .map(f => f.Key)
//     .filter(k => k.endsWith(".tar"));

//   for (const key of tarFiles) {
//     await processTarFile(key);
//   }
// }

// cron.schedule("*/5 * * * *", async () => {
//   console.log("⏳ Cron: Scanning for new .tar files...");
//   await scanAndProcess();
// });
