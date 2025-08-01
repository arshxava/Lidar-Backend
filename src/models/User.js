const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "USER"], default: "USER" },

  // firstName: { type: String, required: true },
  // lastName: { type: String, required: true },
  // sex: { type: String, enum: ["Male", "Female", "Other"], required: true },
  // age: { type: Number, required: true },
  // education: { type: String, required: true },
  // province: { type: String, required: true },
  // country: { type: String, required: true },
  // profilePicture: { type: String , required: true  },
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
