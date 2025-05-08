const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { uploadImage, fetchResource, deleteResource } = require('./cloudinary');
const {
  getDB,
  setDB,
  findImageById,
  updateImageRecord,
  deleteImageById,
  syncDBWithFiles
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Middleware
app.use(cors());
app.use(express.json());

// Serve the /uploads directory as a static resource
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Routes
// Upload endpoint: saves locally and uploads to Cloudinary
app.post('/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    // Use helper for Cloudinary upload
    const result = await uploadImage(file.path, file.originalname);
    
    // Save metadata
    const db = getDB();
    const imageData = {
      id: Date.now().toString(),
      filename: file.filename,
      originalName: file.originalname,
      localPath: file.path,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      uploadedAt: new Date().toISOString(),
      backupKey: req.body.backupKey || null,
      backupData: req.body.backupData || null,
      status: 'available'
    };
    
    db.push(imageData);
    setDB(db);
    
    res.status(201).json({ 
      message: 'Image uploaded successfully', 
      data: imageData 
    });
  } catch (err) {
    console.error('Upload error:', err);
    // Clean up the uploaded file if Cloudinary upload fails
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ error: 'Failed to upload image', details: err.message });
  }
});

// List all images with integrity check
app.get('/images', async (req, res) => {
  try {
    syncDBWithFiles(); // Ensures DB is up-to-date with actual files
    const db = getDB();
    const imagesWithStatus = await Promise.all(db.map(async img => {
      try {
        // Check if local file exists
        const hasLocalFile = fs.existsSync(img.localPath);
        
        // Use helper to check Cloudinary resource
        await fetchResource(img.cloudinaryPublicId);
        return { 
          ...img, 
          status: 'available',
          hasLocalFile 
        };
      } catch (err) {
        // Image not found in Cloudinary
        return { 
          ...img, 
          status: 'missing',
          hasLocalFile: fs.existsSync(img.localPath)
        };
      }
    }));
    
    res.json(imagesWithStatus);
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch images', details: err.message });
  }
});

// Restore image to Cloudinary if it's missing
app.post('/restore/:id', async (req, res) => {
  const { id } = req.params;
  const img = findImageById(id);
  
  if (!img) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  // Add debugging logs to verify the restore process
  console.log("Restoring image with ID:", id);
  console.log("Local path of the image:", img.localPath);

  try {
    // Check if local file exists
    if (!fs.existsSync(img.localPath)) {
      console.error("Local file not found:", img.localPath);
      return res.status(404).json({ error: 'Local image file not found' });
    }
    
    // Use helper to re-upload to Cloudinary
    const result = await uploadImage(img.localPath, img.originalName);
    
    // Update metadata
    img.cloudinaryUrl = result.secure_url;
    img.cloudinaryPublicId = result.public_id;
    img.restoredAt = new Date().toISOString();
    img.status = 'available';
    updateImageRecord(img);
    
    res.json({ 
      message: 'Image restored to Cloudinary', 
      data: img 
    });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore image', details: err.message });
  }
});

// Delete image
app.delete('/images/:id', async (req, res) => {
  const { id } = req.params;
  const img = findImageById(id);
  
  if (!img) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  try {
    // Use helper to delete from Cloudinary
    try {
      await deleteResource(img.cloudinaryPublicId);
    } catch (cloudErr) {
      console.warn('Could not delete from Cloudinary:', cloudErr.message);
    }
    
    // Delete local file
    try {
      if (fs.existsSync(img.localPath)) {
        fs.unlinkSync(img.localPath);
      }
    } catch (fsErr) {
      console.warn('Could not delete local file:', fsErr.message);
    }
    
    // Remove from database
    deleteImageById(id);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete image', details: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Update the endpoint to match frontend request
app.get('/local-images', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = await fs.promises.readdir(uploadsDir);
    
    const images = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadsDir, filename);
        const stats = await fs.promises.stat(filePath);
        
        return {
          filename,
          originalName: filename,
          size: stats.size,
          createdAt: stats.birthtime,
          path: `/api/uploads/${filename}`
        };
      })
    );

    // Filter out non-image files
    const imageFiles = images.filter(file => {
      const ext = path.extname(file.filename).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    res.json(imageFiles);
  } catch (error) {
    console.error('Error listing local images:', error);
    res.status(500).json({ error: 'Failed to list local images' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
