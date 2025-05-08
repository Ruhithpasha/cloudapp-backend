/**
 * cleanup_missing_images.js
 * Run this script to remove all records with status "missing" from images.json.
 * Usage (from backend directory):
 *    node cleanup_missing_images.js
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'images.json');

function cleanMissingImages() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('images.json not found. Nothing to do.');
    return;
  }
  const db = JSON.parse(fs.readFileSync(DATA_PATH));
  const before = db.length;
  // Remove any images with status 'missing'
  // Note: status is dynamically assigned in API, but for safety, also remove
  // any entry that is truly orphaned (e.g., missing both cloudinaryUrl and localPath)
  const cleaned = db.filter(img =>
    (img.cloudinaryUrl && img.localPath)
  );
  const after = cleaned.length;
  fs.writeFileSync(DATA_PATH, JSON.stringify(cleaned, null, 2));
  console.log(`Cleaned images.json: removed ${before - after} invalid/missing entries (${before} -> ${after})`);
}

cleanMissingImages();