const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all brands
router.get("/", (req, res) => {
  db.query("SELECT id, name_en FROM brands WHERE status = true", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ADD brand (optional but useful)
router.post("/", (req, res) => {
  const { name_en } = req.body;

  if (!name_en) {
    return res.status(400).json({ error: "Brand name required" });
  }

  db.query(
    "INSERT INTO brands (name_en) VALUES (?)",
    [name_en],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Brand added successfully" });
    }
  );
});

module.exports = router;