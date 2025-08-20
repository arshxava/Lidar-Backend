const AWS = require("aws-sdk");

const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT); // Use from env
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_ENDPOINT.split('.')[0] // Extracts 'ams3' from endpoint
});

module.exports = s3;