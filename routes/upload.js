const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists before multer tries to write to it
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Clean the filename to remove any weird spaces that could break URLs
    const safeName = file.originalname.replace(/\s+/g, '-');
    const uniqueName = Date.now() + "-" + safeName;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }
  
  // FIX: Only send the clean filename back to the frontend.
  // DO NOT hardcode "http://localhost...". Your React helper handles that now!
  res.json({ 
    message: "File uploaded successfully",
    url: req.file.filename 
  });
});

module.exports = router;