// src/middleware/multer.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { FileDirectoryType } = require("../utils/const");

console.log("multor is called");
const fileFilter = (req, file, cb) => {
    const fileType = req?.query?.type;

    if (fileType === "invoice" && file.mimetype !== "application/pdf") {
        return cb(new Error("Invalid file type. Only PDF allowed for invoices."));
    }

    cb(null, true);
};

const storageData = multer.diskStorage({
    destination: (req, file, cb) => {
        const { type, fileId } = req.query;

        const uploadPath = FileDirectoryType[type]
            ? `./uploads${FileDirectoryType[type]}`
            : null;

        if (!uploadPath) return cb(new Error("Invalid file type"));

        try {
            fs.mkdirSync(uploadPath, { recursive: true });
        } catch (err) {
            return cb(new Error("Failed to create directory"));
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const { fileId } = req.query;
        const baseName = fileId ? `file_${fileId}` : file.fieldname;
        cb(null, `${baseName}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage: storageData,
    fileFilter,
});

module.exports = upload;

