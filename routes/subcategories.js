const express = require("express");
const router = express.Router();
const db = require("../db");

// GET subcategories by category_id
router.get("/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;

  db.query(
    "SELECT * FROM subcategories WHERE category_id = ? AND status = true",
    [categoryId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

module.exports = router;