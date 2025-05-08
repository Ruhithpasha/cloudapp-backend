require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Ensure credentials are present in environment
['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(localPath, originalName) {
  return cloudinary.uploader.upload(localPath, {
    folder: 'cloudapp',
    use_filename: true,
    filename_override: originalName,
  });
}

// Add a test log to verify the response from Cloudinary
async function fetchResource(publicId) {
  try {
    const resource = await cloudinary.api.resource(publicId);
    console.log("Cloudinary resource fetched successfully:", resource);
    return resource;
  } catch (error) {
    console.error("Error fetching Cloudinary resource:", error);
    throw error; // Re-throw the error for further handling
  }
}

async function deleteResource(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

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

module.exports = { uploadImage, fetchResource, deleteResource, checkCloudinaryImage };