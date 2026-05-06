const express = require("express");
const router = express.Router();
const db = require("../db");

// FIX: Only select safe fields — never return the password hash
router.get("/", (req, res) => {
  db.query("SELECT id, name, email FROM users", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

module.exports = router;