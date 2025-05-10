const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { uploadImage, fetchResource, deleteResource } = require('./cloudinary');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Serve the /uploads directory as a static resource
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  console.log('Creating uploads directory:', UPLOAD_DIR);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedFilename);
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
  try {
    console.log("Received upload request");
    
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: 'No file uploaded' });
    }
  
    console.log("File details:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Verify file exists locally before uploading to Cloudinary
    if (!fs.existsSync(req.file.path)) {
      console.error("Local file not found after upload:", req.file.path);
      return res.status(500).json({ error: 'Failed to save file locally' });
    }

    // Upload to Cloudinary with retry
    let cloudinaryResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`Uploading to Cloudinary (attempt ${retryCount + 1})...`);
        cloudinaryResult = await uploadImage(req.file.path, req.file.originalname);
        console.log("Cloudinary upload successful:", cloudinaryResult);
        break;
      } catch (err) {
        retryCount++;
        console.error(`Cloudinary upload attempt ${retryCount} failed:`, err);
        if (retryCount === maxRetries) {
          throw new Error(`Failed to upload to Cloudinary after ${maxRetries} attempts: ${err.message}`);
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Create response object
    const image = {
      id: req.file.filename,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      size: req.file.size,
      createdAt: new Date().toISOString(),
      status: 'available'
    };

    console.log("Created image entry:", image);
    res.json(image);
  } catch (error) {
    console.error('Error uploading image:', error);
    // Clean up local file if Cloudinary upload failed
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log("Cleaned up local file after failed upload");
      } catch (cleanupErr) {
        console.error("Failed to clean up local file:", cleanupErr);
      }
    }
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// List all images
app.get('/local-images', async (req, res) => {
  try {
    console.log("Received request for local images");
    const uploadsDir = path.join(__dirname, 'uploads');
    console.log("Checking uploads directory:", uploadsDir);
    
    // Check if directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log("Uploads directory does not exist, creating it");
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const files = await fs.promises.readdir(uploadsDir);
    console.log("Found files in uploads directory:", files);
    
    const images = await Promise.all(
      files.map(async (filename) => {
        try {
          const filePath = path.join(uploadsDir, filename);
          const stats = await fs.promises.stat(filePath);
          
          // Extract public ID from filename (remove timestamp and extension)
          const parts = filename.split('-');
          const timestamp = parts[0];
          const rest = parts.slice(1).join('-');
          const publicId = rest.split('.')[0];
          
          console.log("Processing file:", {
            filename,
            timestamp,
            publicId
          });
          
          // Check if file exists in Cloudinary
          const cloudinaryResult = await fetchResource(publicId);
          console.log("Cloudinary check result:", cloudinaryResult);
          
          // If not found, try with timestamp
          if (!cloudinaryResult.exists) {
            console.log("Trying with timestamp included");
            const cloudinaryResultWithTimestamp = await fetchResource(filename.split('.')[0]);
            if (cloudinaryResultWithTimestamp.exists) {
              console.log("Found with timestamp");
              return {
                id: filename,
                filename,
                originalName: filename,
                size: stats.size,
                createdAt: stats.birthtime,
                path: `/uploads/${filename}`,
                cloudinaryUrl: cloudinaryResultWithTimestamp.url,
                cloudinaryPublicId: cloudinaryResultWithTimestamp.publicId,
                status: 'available',
                canRestore: false
              };
            }
          }

          // Check if local file exists and is readable
          const localFileExists = await fs.promises.access(filePath, fs.constants.R_OK)
            .then(() => true)
            .catch(() => false);
          
          console.log("Local file check:", {
            filename,
            exists: localFileExists
          });
          
          return {
            id: filename,
            filename,
            originalName: filename,
            size: stats.size,
            createdAt: stats.birthtime,
            path: `/uploads/${filename}`,
            cloudinaryUrl: cloudinaryResult.url,
            cloudinaryPublicId: cloudinaryResult.publicId,
            status: cloudinaryResult.exists ? 'available' : 'missing',
            canRestore: !cloudinaryResult.exists && localFileExists // Can restore if missing from Cloudinary but exists locally
          };
        } catch (err) {
          console.error(`Error processing file ${filename}:`, err);
          // Return basic info if there's an error
          return {
            id: filename,
            filename,
            originalName: filename,
            path: `/uploads/${filename}`,
            cloudinaryUrl: null,
            cloudinaryPublicId: null,
            status: 'missing',
            canRestore: true // Assume it can be restored if we hit an error
          };
        }
      })
    );

    // Filter out non-image files
    const imageFiles = images.filter(file => {
      const ext = path.extname(file.filename).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log("Sending response with image files:", imageFiles);
    res.json(imageFiles);
  } catch (error) {
    console.error('Error listing local images:', error);
    res.status(500).json({ 
      error: 'Failed to list local images',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Restore image to Cloudinary if it's missing
app.post('/restore/:filename', async (req, res) => {
  const { filename } = req.params;
  console.log("Restore request received for filename:", filename);
  
  try {
    // Get the local file path
    const localPath = path.join(__dirname, 'uploads', filename);
    console.log("Local path of the image:", localPath);

    // Check if local file exists
    if (!fs.existsSync(localPath)) {
      console.error("Local file not found:", localPath);
      return res.status(404).json({ error: 'Local image file not found' });
    }
    
    // Use helper to re-upload to Cloudinary
    console.log("Uploading to Cloudinary...");
    const result = await uploadImage(localPath, filename);
    console.log("Cloudinary upload successful:", result);
    
    // Return success response
    res.json({ 
      message: 'Image restored to Cloudinary', 
      data: {
        filename: filename,
        cloudinaryUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        status: 'available'
      }
    });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore image', details: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
