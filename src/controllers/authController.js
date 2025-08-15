const bcrypt = require("bcryptjs");
 
const jwt = require("jsonwebtoken");
 
const User = require("../models/User");
const profilePicUpload = require("../middleware/profilepicture");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

exports.login = async (req, res) => {
  const { email, password } = req.body;
 
  try {
 
    const user = await User.findOne({ email });
 
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });
 
 
 
    const isMatch = await bcrypt.compare(password, user.password);
 
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
 
 
 
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
 
    res.json({
 
      token,
 
      user: {
 
        id: user._id,
        email: user.email,
        role: user.role,
        username: user.username,
      }
 
    });
 
  } catch (err) {
 
    res.status(500).json({ msg: "Login failed" });
 
  }
 
};

exports.register = async (req, res) => {
  const {
    username,
    email,
    password,
    role,
    firstName,
    lastName,
    sex,
    age,
    education,
    province,
    country,
  } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already in use" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already in use" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;

    // Only upload if a file is provided
    if (req.file) {
      profilePictureUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "profile_pictures" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      firstName,
      lastName,
      sex,
      age,
      education,
      province,
      country,
      profilePicture: profilePictureUrl, // will be null if not provided
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        sex: user.sex,
        age: user.age,
        education: user.education,
        province: user.province,
        country: user.country,
        profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ msg: "Registration failed" });
  }
};
