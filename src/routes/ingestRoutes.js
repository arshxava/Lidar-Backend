const express = require('express');
const { ingestFile } =require('../controllers/ingestController');
const router = express.Router();
 
// Route to trigger processing & tiling
router.post("/ingest", ingestFile);
 
module.exports=router;