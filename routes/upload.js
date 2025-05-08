const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save file with original name and unique timestamp
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// Added error handling to ensure consistent JSON responses
router.post('/', upload.single('file'), (req, res) => {
  console.log('File upload request received');
  console.log('File details:', req.file);
  
  // Add debugging log to check if file is received
  console.log('File received:', req.file);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path,
    });
  } catch (err) {
    console.error('Error during file upload:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;