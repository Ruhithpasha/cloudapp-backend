/**
 * cleanup_all_local_storage.js
 * Completely wipes the /uploads directory (local images)
 * and clears images.json (removes all DB records).
 *
 * Usage: node cleanup_all_local_storage.js
 */

const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_PATH = path.join(__dirname, 'images.json');

// Remove all files in uploads directory
function clearUploads() {
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      const fullPath = path.join(UPLOADS_DIR, file);
      try {
        fs.unlinkSync(fullPath);
        console.log(`[CLEANUP] Deleted: ${fullPath}`);
      } catch (err) {
        console.warn(`[CLEANUP] Could not delete file ${fullPath}: ${err.message}`);
      }
    }
    // Optional: remove uploads dir itself if you want (usually not needed)
    // fs.rmdirSync(UPLOADS_DIR);
  } else {
    console.log("[CLEANUP] uploads directory does not exist.");
  }
}

// Wipe images.json (set to [])
function clearImagesDB() {
  fs.writeFileSync(DATA_PATH, '[]');
  console.log(`[CLEANUP] Cleared ${DATA_PATH}`);
}

function cleanupAll() {
  clearUploads();
  clearImagesDB();
  console.log("[CLEANUP] Local storage and database fully wiped!");
}

cleanupAll();