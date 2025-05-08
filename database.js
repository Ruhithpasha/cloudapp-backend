const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'images.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function ensureDB() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
  }
}

function getDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

function setDB(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function findImageById(id) {
  const db = getDB();
  return db.find(img => String(img.id) === String(id));
}

function updateImageRecord(imageRecord) {
  const db = getDB();
  const index = db.findIndex(img => String(img.id) === String(imageRecord.id));
  if (index !== -1) {
    db[index] = imageRecord;
    setDB(db);
  }
}

function deleteImageById(id) {
  const db = getDB();
  const initialLength = db.length;
  // Remove ALL images whose id matches, with leniency for numeric or string id
  const cleanedDB = db.filter(img => String(img.id) !== String(id));
  const removedCount = initialLength - cleanedDB.length;
  setDB(cleanedDB);
  if (removedCount > 0) {
    console.log(`[DB] Removed image(s) with id=${id} (${removedCount} record(s) removed).`);
  } else {
    console.warn(`[DB] No image found to remove for id=${id}.`);
  }
}

// Remove all DB entries for which the file doesn't exist in uploads/
function syncDBWithFiles() {
  ensureDB();
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
  }
  const db = getDB();
  const filesSet = new Set(fs.readdirSync(UPLOADS_DIR));
  // Keep only those DB entries whose files exist in UPLOADS_DIR
  const filtered = db.filter(img => {
    const fileInUploads = img.filename && filesSet.has(img.filename);
    if (!fileInUploads) {
      console.log(`[SYNC] Removing DB entry for missing file: ${img.filename}`);
    }
    return fileInUploads;
  });
  if (filtered.length !== db.length) {
    setDB(filtered);
    console.log(`[SYNC] Synced database: removed ${db.length - filtered.length} stale records.`);
  }
}

module.exports = {
  getDB,
  setDB,
  findImageById,
  updateImageRecord,
  deleteImageById,
  syncDBWithFiles,
};
