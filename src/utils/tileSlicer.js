const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const s3 = require("./spacesClient");

const BUCKET = process.env.DO_SPACES_BUCKET;
const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE;

async function tileAndUploadToSpaces(rasterBuffer, { mapId, rows, cols }) {
  const image = sharp(rasterBuffer);
  const metadata = await image.metadata();

  const tileWidth = Math.floor(metadata.width / cols);
  const tileHeight = Math.floor(metadata.height / rows);
  const tileUrls = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileName = `tile_${row}_${col}.png`;
      const tileBuffer = await image
        .extract({ left: col * tileWidth, top: row * tileHeight, width: tileWidth, height: tileHeight })
        .png()
        .toBuffer();

      const key = `tiles/${mapId}/${tileName}`;
      await s3.putObject({
        Bucket: BUCKET,
        Key: key,
        Body: tileBuffer,
        ACL: "public-read",
        ContentType: "image/png"
      }).promise();

      tileUrls.push(`${PUBLIC_BASE}/${key}`);
    }
  }
  return tileUrls;
}

module.exports = { tileAndUploadToSpaces };
