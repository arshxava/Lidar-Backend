const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "USER"], default: "USER" },

  firstName: { type: String },
  lastName: { type: String},
  sex: { type: String, enum: ["Male", "Female", "Other"]},
  age: { type: Number },
  education: { type: String},
  province: { type: String },
  country: { type: String},
  profilePicture: { type: String },
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
