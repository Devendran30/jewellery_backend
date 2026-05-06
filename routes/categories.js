const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all categories
router.get("/", (req, res) => {
  db.query("SELECT * FROM categories WHERE status = true", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

module.exports = router;