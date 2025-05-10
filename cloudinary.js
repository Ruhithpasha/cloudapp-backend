require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Ensure credentials are present in environment
['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadImage = async (filePath, originalName) => {
  try {
    console.log("Uploading to Cloudinary:", filePath);
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      public_id: originalName.split('.')[0] // Remove extension
    });
    console.log("Upload successful:", result);
    return result;
  } catch (err) {
    console.error("Error uploading to Cloudinary:", err);
    throw err;
  }
};

// Check if resource exists in Cloudinary
const fetchResource = async (publicId) => {
  try {
    console.log("Checking Cloudinary resource:", publicId);
    
    // First try to get resource details
    try {
      // Try with and without file extension
      const result = await cloudinary.api.resource(publicId);
      console.log("Resource exists (via API):", result.public_id);
      return {
        exists: true,
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (apiError) {
      console.log("API check failed, trying URL check");
      
      // Try different URL formats
      const urlFormats = [
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`,
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`,
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.png`
      ];

      for (const url of urlFormats) {
        try {
          console.log("Trying URL:", url);
          const resp = await fetch(url, { 
            method: "HEAD",
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'image/*'
            }
          });
          
          if (resp.ok) {
            console.log("Resource exists (via URL):", url);
            return {
              exists: true,
              url: url,
              publicId: publicId
            };
          }
        } catch (urlError) {
          console.log("URL check failed:", url);
          continue;
        }
      }
      
      console.log("Resource not found:", publicId);
      return {
        exists: false,
        url: null,
        publicId: null
      };
    }
  } catch (err) {
    console.error("Error checking Cloudinary resource:", err);
    return {
      exists: false,
      url: null,
      publicId: null
    };
  }
};

// Delete resource from Cloudinary
const deleteResource = async (publicId) => {
  try {
    console.log("Deleting Cloudinary resource:", publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Delete successful:", result);
    return result;
  } catch (err) {
    console.error("Error deleting from Cloudinary:", err);
    throw err;
  }
};

const checkCloudinaryImage = async (url) => {
  try {
    // Validate URL
    if (!url || !url.includes('cloudinary.com')) {
      console.log("Invalid Cloudinary URL:", url);
      return false;
    }

    // Extract public_id from URL
    const urlParts = url.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];
    
    if (!publicId) {
      console.log("Could not extract public_id from URL:", url);
      return false;
    }

    try {
      // Try to fetch resource details from Cloudinary API
      const resource = await cloudinary.api.resource(publicId);
      console.log("Cloudinary resource exists:", resource.public_id);
      return true;
    } catch (apiError) {
      console.log("Cloudinary API error:", apiError.message);
      
      // Fallback to HTTP request if API fails
      const resp = await fetch(url, { 
        method: "HEAD",
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (resp.ok) {
        console.log("Image exists (via HTTP):", url);
        return true;
      }

      // If HEAD fails, try GET
      const getResp = await fetch(url, { 
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (getResp.ok) {
        console.log("Image exists (via GET):", url);
        return true;
      }

      console.log("Image does not exist:", url);
      return false;
    }
  } catch (error) {
    console.error("Error checking Cloudinary image:", error.message);
    return false;
  }
};

module.exports = {
  uploadImage,
  fetchResource,
  deleteResource,
  checkCloudinaryImage
};