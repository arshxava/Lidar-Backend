// const express = require('express');
// const { register, login } = require('../controllers/authController');
// const router = express.Router();

// router.post('/register', register);
// router.post('/login', login);

// module.exports = router;
const express = require('express');
const { register, login } = require('../controllers/authController');
const profilePicUpload = require('../middleware/profilepicture');
const router = express.Router();

router.post('/register', profilePicUpload.single("profilePic"), register);
router.post('/login', login);

module.exports = router;
