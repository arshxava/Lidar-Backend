// const cron = require('node-cron');
// const s3 = require('./spacesClient');
// const fs = require('fs');
// const { processAllRawMaps } = require('./processSpaceMap'); // ✅ Import updated function

// cron.schedule('* * * * * *', async () => {
//   console.log('⏳ Cron: scanning lidar/zips/ for new uploads...');
  
//   // ✅ Process all tar files automatically
//   await processAllRawMaps();

//   // ✅ Backup logic stays as-is
//   try {
//     const fileName = 'backup.json';
//     const fileContent = fs.readFileSync(`./backups/${fileName}`);

//     await s3.putObject({
//       Bucket: process.env.DO_SPACES_BUCKET,
//       Key: fileName,
//       Body: fileContent,
//       ACL: 'private'
//     }).promise();

//     console.log('Backup uploaded successfully!');
//   } catch (err) {
//     console.error('Error uploading backup:', err);
//   }
// });


const cron = require('node-cron');
const s3 = require('./spacesClient');
const fs = require('fs');
const { processAllRawMaps } = require('./processSpaceMap'); // ✅ Import updated function

// ✅ Run immediately when the server starts
(async () => {
  console.log('🚀 Server started: processing existing raw maps...');
  await processAllRawMaps();
  console.log('✅ Initial processing completed.');
})();

// ✅ Schedule cron job to run every minute (not every second)
cron.schedule('* * * * *', async () => {
  console.log('⏳ Cron: scanning lidar/zips/ for new uploads...');
  
  // ✅ Process all tar files automatically
  await processAllRawMaps();

  // ✅ Backup logic stays as-is
  try {
    const fileName = 'backup.json';
    const fileContent = fs.readFileSync(`./backups/${fileName}`);

    await s3.putObject({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: fileName,
      Body: fileContent,
      ACL: 'private'
    }).promise();

    console.log('Backup uploaded successfully!');
  } catch (err) {
    console.error('Error uploading backup:', err);
  }
});
