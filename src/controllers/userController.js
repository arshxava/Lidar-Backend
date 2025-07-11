const Annotation = require("../models/Annotation");
const User = require("../models/User");
const mongoose = require("mongoose");

exports.getUserAnnotations = async (req, res) => {
  try {
    const annotations = await Annotation.find({ userId: req.params.id });
    res.json(annotations);
  } catch (err) {
    // console.error("Fetching user annotations failed:", err);
    res.status(500).json({ message: "Failed to fetch annotations" });
  }
};
exports.getLeaderboard = async (req, res) => {
  try {
    // console.log("🔐 Authenticated User:", req.user); // 👈 log user
    const userId = new mongoose.Types.ObjectId(req.user._id); // must match this format

    // console.log("🔍 Querying annotations for userId:", userId);

    const results = await Annotation.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $project: {
          username: { $arrayElemAt: ["$user.username", 0] },
          name: { $arrayElemAt: ["$user.name", 0] },
          count: 1
        }
      }
    ]);

    // console.log("📊 Leaderboard Results:", results); // 👈 see what you're getting

    res.json(results);
  } catch (err) {
    // console.error("❌ Leaderboard fetch error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};
