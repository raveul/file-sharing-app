// Load environment variables
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

const app = express();

// Generate a unique upload ID for each request
app.use((req, res, next) => {
  req.uploadId = uuidv4(); // Generate a single upload ID for all files
  next();
});

// Configure multer to use the same upload ID for all files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', req.uploadId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Configure email transporter (same as before)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// File upload endpoint
app.post('/upload', upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    res.json({ 
      uploadId: req.uploadId,
      message: 'Upload successful!'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// File download endpoint
app.get('/download/:uploadId', (req, res) => {
  const uploadId = req.params.uploadId;
  const uploadPath = path.join(__dirname, 'uploads', uploadId);

  if (!fs.existsSync(uploadPath)) {
    return res.status(404).send('File or folder not found');
  }

  const files = fs.readdirSync(uploadPath);
  if (files.length === 1) {
    // Single file: serve directly
    const filePath = path.join(uploadPath, files[0]);
    res.download(filePath, files[0]);
  } else {
    // Multiple files: zip and send
    const archive = archiver('zip', { zlib: { level: 9 }});
    res.attachment(`${uploadId}.zip`);
    archive.pipe(res);
    archive.directory(uploadPath, false);
    archive.finalize();
  }
});

// Email sharing endpoint (same as before)
app.post('/share/email', (req, res) => {
  // ... (keep the existing code)
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});