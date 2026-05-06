const express = require("express");
const router = express.Router();
const db = require("../db");
const axios = require("axios");
const Razorpay = require("razorpay");

// ==========================================
// 🔐 UTILITY: SHIPROCKET AUTH TOKEN
// ==========================================
const getShiprocketToken = async () => {
  try {
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );
    return response.data.token;
  } catch (error) {
    console.error("❌ Shiprocket Auth Failed:", error.response?.data || error.message);
    return null;
  }
};

// ==========================================
// 🚚 UTILITY: SYNC ORDER TO SHIPROCKET
// ==========================================
const syncToShiprocket = async (orderId) => {
  console.log(`--- 🛰️ Starting Shiprocket Sync for Order #${orderId} ---`);

  try {
    const token = await getShiprocketToken();
    if (!token) return console.log("❌ Sync Aborted: No valid Token.");

    const [rows] = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM orders WHERE id = ?", [orderId], (err, result) => {
        if (err) reject(err);
        else resolve([result]);
      });
    });

    if (!rows || rows.length === 0) return console.log("❌ Order not found in DB.");
    const order = rows[0];

    const phone = (order.phone && order.phone.toString().length >= 10) 
      ? order.phone.toString().slice(-10) 
      : "9999999999";

    const nameParts = (order.customer_name || "Customer User").trim().split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const payload = {
      order_id: order.id.toString(),
      order_date: new Date(order.created_at).toISOString().split("T")[0],
      pickup_location: "Primary", 
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: (order.address || "No Address").substring(0, 150),
      billing_city: order.city || "City",
      billing_pincode: order.pincode || "000000",
      billing_state: order.state || "State",
      billing_country: "India",
      billing_email: order.email || "test@example.com",
      billing_phone: phone,
      shipping_is_billing: true,
      order_items: [
        {
          name: "Jewelry Item",
          sku: "JW-01",
          units: 1,
          selling_price: order.total_amount.toString(),
        },
      ],
      payment_method: order.payment_method === "cod" ? "Postpaid" : "Prepaid",
      sub_total: order.total_amount.toString(),
      length: 10, breadth: 10, height: 5, weight: 0.5,
    };

    const shipRes = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const finalShipId = shipRes.data.shipment_id || shipRes.data.order_id || "SYNCED";
    console.log(`✅ Order #${orderId} pushed. Ref: ${finalShipId}`);

  } catch (error) {
    console.log("❌ SHIPROCKET REJECTION:", error.response?.data || error.message);
  }
};

// ==========================================
// 💳 ROUTE: CREATE RAZORPAY ORDER
// ==========================================
router.post("/create-razorpay-order", async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: "Razorpay keys missing in .env" });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(req.body.amount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`, 
    };

    const order = await instance.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("❌ Razorpay Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🛒 ROUTE: PLACE ORDER (FINAL DB SAVE)
// ==========================================
router.post("/place-order", (req, res) => {
  const { 
    customer_name, email, phone, address, city, state, 
    pincode, total_amount, payment_method, payment_status, items 
  } = req.body;

  // Determine status: Online orders are auto-approved, COD is "Approved" for sync
  const orderStatus = payment_method === "cod" ? "Approved" : "Approved";

  const sql = `INSERT INTO orders (customer_name, email, phone, address, city, state, pincode, total_amount, payment_method, payment_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    customer_name, 
    email, 
    phone, 
    address, 
    city, 
    state, 
    pincode, 
    total_amount, 
    payment_method || "cod", 
    payment_status || "Pending", // Now dynamic based on frontend response
    orderStatus
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const orderId = result.insertId;
    const itemValues = items.map((item) => [orderId, item.id, item.quantity, item.price || 0]);

    db.query("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?", [itemValues], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Automatically sync all approved orders to Shiprocket
      syncToShiprocket(orderId);

      res.json({ message: "Order processed successfully!", orderId });
    });
  });
});

// ==========================================
// 🔄 ROUTE: UPDATE STATUS (ADMIN)
// ==========================================
router.patch("/:id", (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  let payment_status = status === "Delivered" ? "Paid" : (status === "Cancelled" ? "Void" : undefined);
  let sql = "UPDATE orders SET status = ?";
  let params = [status];

  if (payment_status) {
    sql += ", payment_status = ?";
    params.push(payment_status);
  }
  sql += " WHERE id = ?";
  params.push(id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: "Update failed" });
    if (status === "Approved") syncToShiprocket(id);
    res.json({ message: `Status updated to ${status}` });
  });
});

// ==========================================
// 📊 ROUTES: LISTING & ANALYTICS
// ==========================================
router.get("/stats", (req, res) => {
  const salesSql = `SELECT DATE_FORMAT(created_at, '%M %d') as date, SUM(total_amount) as total FROM orders GROUP BY date ORDER BY MIN(created_at) ASC LIMIT 7`;
  const statusSql = `SELECT status, COUNT(*) as count FROM orders GROUP BY status`;

  db.query(salesSql, (err, salesData) => {
    if (err) return res.status(500).json(err);
    db.query(statusSql, (err, statusData) => {
      if (err) return res.status(500).json(err);
      res.json({ sales: salesData, status: statusData });
    });
  });
});

router.get("/all", (req, res) => {
  db.query("SELECT * FROM orders ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

router.get("/user/:email", (req, res) => {
  db.query("SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC", [req.params.email], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

module.exports = router;