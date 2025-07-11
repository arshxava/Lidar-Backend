

// const { createCanvas, loadImage } = require("canvas");
// const fs = require("fs");
// const path = require("path");

// const generateAnnotatedImage = async (tileId, annotations, originalImagePath) => {
//   try {
//     const image = await loadImage(originalImagePath);
//     const canvas = createCanvas(image.width, image.height);
//     const ctx = canvas.getContext("2d");

//     ctx.drawImage(image, 0, 0);

//     ctx.strokeStyle = "red";
//     ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
//     ctx.lineWidth = 2;

//     annotations.forEach((annotation, index) => {
//       const { type, points } = annotation;

//       if (!points || points.length === 0) {
//         console.warn(`⚠️ No points found in annotation #${index}`, annotation);
//         return;
//       }

//       // if (type === "point") {
//       //   const { x, y } = points[0];
//       //   ctx.beginPath();
//       //   ctx.arc(x, y, 5, 0, Math.PI * 2);
//       //   ctx.fill();
//       //   console.log(`🖍️ Drew point at (${x}, ${y})`);
//       // }

//       if (type === "polygon") {
//         ctx.beginPath();
//         points.forEach((point, idx) => {
//           if (idx === 0) ctx.moveTo(point.x, point.y);
//           else ctx.lineTo(point.x, point.y);
//         });
//         ctx.closePath();
//         ctx.stroke(); // ✅ Only outline

//         if (annotation.label) {
//           const labelPoint = points[0];
//           ctx.font = "16px Arial";
//           ctx.fillStyle = "red";
//           ctx.fillText(annotation.label, labelPoint.x + 5, labelPoint.y - 10);
//         }

//         console.log('🖍️ Drew polygon with ${points.length} points');
//       }

//     });


//     const outputFile = `annotated_${tileId}_${Date.now()}.png`;
//     const annotatedPath = path.join(process.cwd(), "public", "annotated_tiles", outputFile);

//     console.log("📝 Will save annotated image to:", annotatedPath);

//     fs.mkdirSync(path.dirname(annotatedPath), { recursive: true });

//     const out = fs.createWriteStream(annotatedPath);
//     const stream = canvas.createPNGStream();
//     stream.pipe(out);

//     return new Promise((resolve, reject) => {
//       out.on("finish", () => {
//         console.log("✅ Annotated image saved:", annotatedPath);
//         resolve(`/annotated_tiles/${outputFile}`);
//       });
//       out.on("error", (err) => {
//         console.error("❌ Error writing annotated image:", err);
//         reject(err);
//       });
//     });
//   } catch (error) {
//     console.error("❌ generateAnnotatedImage failed:", error.message);
//     return null;
//   }
// };

// module.exports = generateAnnotatedImage;


const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const generateAnnotatedImage = async (tileId, annotations, originalImagePath) => {
  try {
    const image = await loadImage(originalImagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0);

    ctx.strokeStyle = "red";
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.lineWidth = 2;

    annotations.forEach((annotation, index) => {
      const { type, points, label } = annotation;

      if (!points || points.length === 0) {
        console.warn(`⚠️ No points found in annotation #${index}`, annotation);
        return;
      }

      if (type === "polygon") {
        ctx.beginPath();
        points.forEach((point, idx) => {
          if (idx === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.stroke(); // Draw outline

        // Draw label
        if (label) {
          const labelPoint = points[0];
          ctx.font = "16px Arial";
          ctx.fillStyle = "red"; // ✅ Reset to visible red before drawing text
          ctx.fillText(label, labelPoint.x + 5, labelPoint.y - 10);
        }

        console.log(`🖍️ Drew polygon with ${points.length} points`);
      }

      // Optional: enable point drawing
      // if (type === "point") {
      //   const { x, y } = points[0];
      //   ctx.beginPath();
      //   ctx.arc(x, y, 5, 0, Math.PI * 2);
      //   ctx.fill();
      //   console.log(`🖍️ Drew point at (${x}, ${y})`);
      // }
    });

    const outputFile = `annotated_${tileId}_${Date.now()}.png`;
    const annotatedPath = path.join(process.cwd(), "public", "annotated_tiles", outputFile);

    console.log("📝 Will save annotated image to:", annotatedPath);
    fs.mkdirSync(path.dirname(annotatedPath), { recursive: true });

    const out = fs.createWriteStream(annotatedPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    return new Promise((resolve, reject) => {
      out.on("finish", () => {
        console.log("✅ Annotated image saved:", annotatedPath);
        resolve(`/annotated_tiles/${outputFile}`);
      });
      out.on("error", (err) => {
        console.error("❌ Error writing annotated image:", err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("❌ generateAnnotatedImage failed:", error.message);
    return null;
  }
};

module.exports = generateAnnotatedImage;
