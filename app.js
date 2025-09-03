require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // ✅ required for static path
const authRoutes = require('./src/routes/authRoutes');
const mapRoutes = require('./src/routes/mapRoutes');
const tileRoutes = require('./src/routes/tileRoutes');
const userRoutes = require('./src/routes/userRoutes');
const annotationRoutes = require('./src/routes/annotationRoutes');
const contactusRoutes = require('./src/routes/contactusRoutes');
const projectRoutes = require('./src/routes/projects')
const ingestRoutes=require('./src/routes/ingestRoutes')
// const cronJob = require('./src/utils/cronJob');
const app = express();
 
app.use(cors());
app.use(express.json());
 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/annotated_tiles", express.static(path.join(__dirname, "public/annotated_tiles")));
 
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/tiles', tileRoutes);
app.use('/api/users', userRoutes);
app.use("/api/annotations", annotationRoutes);
app.use("/api/contactus", contactusRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", ingestRoutes);
 
 
// app.use('/api/leaderboard', userRoutes);   
 
 
app.get('/', (req, res) => res.send('LiDAR Dashboard API Running'));
 
module.exports = app;