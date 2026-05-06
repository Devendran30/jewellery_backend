const express = require("express");
const router = express.Router();
const db = require("../db");

// 📊 Order Stats
router.get("/stats", (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) AS totalOrders,
      SUM(status = 'pending') AS pending,
      SUM(status = 'completed') AS completed,
      SUM(total_amount) AS revenue
    FROM orders
  `;

  db.query(sql, (err, result) => {
    if (err) return res.json(err);
    res.json(result[0]);
  });
});

module.exports = router;