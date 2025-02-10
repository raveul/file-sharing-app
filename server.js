const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Email configuration (using Gmail's free SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'robinexp001@gmail.com', // Replace with your Gmail
    pass: 'ebjw nfzs qufo gwxe', // Replace with your Gmail app password
  },
});

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileId = req.file.filename;
  const filePath = path.join(__dirname, 'uploads', fileId);

  // Rename the file to include the original name
  const originalName = req.file.originalname;
  const newFilePath = path.join(__dirname, 'uploads', `${fileId}-${originalName}`);
  fs.renameSync(filePath, newFilePath);

  res.json({ fileId, originalName });
});

// Email sharing endpoint
app.post('/share/email', (req, res) => {
  const { email, fileId } = req.body;

  // Validate input
  if (!email || !fileId) {
    return res.status(400).json({ error: 'Email and file ID are required' });
  }

  // Dynamically construct the download link
  const protocol = req.protocol; // http or https
  const host = req.get('host'); // e.g., localhost:3000 or your-app.onrender.com
  const downloadLink = `${protocol}://${host}/download/${fileId}`;

  // Email options
  const mailOptions = {
    from: 'robinexp001@gmail.com', // Replace with your Gmail
    to: email,
    subject: 'File Shared with You',
    text: `Download your file here: ${downloadLink}`,
    html: `<p>Download your file here: <a href="${downloadLink}">${downloadLink}</a></p>`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    console.log('Email sent:', info.response);
    res.status(200).json({ message: 'Email sent successfully' });
  });
});

// File download endpoint
app.get('/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const filePath = path.join(__dirname, 'uploads', `${fileId}-*`);

  // Find the file with the matching ID
  fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
    if (err) {
      return res.status(500).send('Error finding file');
    }

    const file = files.find((f) => f.startsWith(fileId));
    if (!file) {
      return res.status(404).send('File not found');
    }

    const fullPath = path.join(__dirname, 'uploads', file);
    res.download(fullPath, file.split('-').slice(1).join('-'));
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});