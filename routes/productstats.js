const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/stats", (req, res) => {
  // We removed 'status' and 'stock' because your database doesn't have them yet.
  const sql = `
    SELECT 
      CAST(COUNT(*) AS UNSIGNED) AS totalProducts,
      CAST(COUNT(*) AS UNSIGNED) AS activeProducts,
      0 AS outOfStock
    FROM products
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Stats Query Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result[0]);
  });
});

module.exports = router;