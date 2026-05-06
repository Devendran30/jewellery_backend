const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Use environment variable for the secret key
const SECRET_KEY = process.env.JWT_SECRET || "change_this_in_production";

// ==========================================
// 🛡️ MIDDLEWARE: VERIFY ADMIN
// ==========================================
// This checks if the person requesting the data has a valid token AND is an admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Get token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Attach user payload to request

    // Check if the user's role is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    next(); // User is admin, allow them to proceed to the route
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// ==========================================
// 1. SIGNUP ROUTE
// ==========================================
router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email & password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Defaulting to 'user' if no role is provided
    const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
    const values = [name, email, hashedPassword, role || 'user'];

    db.query(sql, values, (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Email already exists" });
        }
        console.error("Signup Database Error:", err);
        return res.status(500).json({ error: "Database error during registration" });
      }
      res.json({ message: "User registered successfully" });
    });
  } catch (err) {
    console.error("Bcrypt Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==========================================
// 2. LOGIN ROUTE
// ==========================================
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) {
        console.error("Login Database Error:", err);
        return res.status(500).json({ error: "Database error during login" });
      }

      if (result.length === 0) {
        return res.status(400).json({ error: "User not found" });
      }

      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // JWT payload includes role
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        SECRET_KEY,
        { expiresIn: "1d" }
      );

      res.json({ 
        message: "Login successful", 
        token,
        role: user.role,
        name: user.name // It's often helpful to send the name back to the frontend too!
      });
    }
  );
});

// ==========================================
// 3. GET ALL USERS (For Admin Dashboard)
// ==========================================
// 🚨 FIX: Added `verifyAdmin` middleware to protect this route!
router.get("/users", verifyAdmin, (req, res) => {
  const sql = "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC";
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch Users Error:", err);
      return res.status(500).json({ error: "Database error while fetching users" });
    }
    res.json(results);
  });
});

module.exports = router;