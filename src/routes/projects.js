// import express from "express";
// import authMiddleware from "../middleware/authMiddleware.js";
// import { getProjects, addProject, deleteProject } from "../controllers/projectController.js";

const express = require("express");
const router = express.Router();
const {getProjects, addProject, deleteProject  } = require("../controllers/projectController.js");
  const authMiddleware = require("../middleware/authMiddleware");
// const authMiddleware = require('../middleware/authMiddleware');

router.get("/", authMiddleware, getProjects);
router.post("/add", authMiddleware, addProject);
router.delete("/:id", authMiddleware, deleteProject);

module.exports = router;
