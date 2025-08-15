const Project = require('../models/projects')
const mongoose = require("mongoose");


exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
};


exports.addProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    const newProject = new Project({
      name,
      description,
      createdBy: req.user._id, // ✅ Attach user ID from token
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error("❌ Failed to add project:", error);
    res.status(400).json({ message: "Failed to add project", error: error.message });
  }
};


exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
};
