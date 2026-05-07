require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// --- Import Routes ---
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const brandRoutes = require("./routes/brands");
const subcategoryRoutes = require("./routes/subcategories");
const uploadRoutes = require("./routes/upload");
const authRoutes = require("./routes/auth");
const productstats = require("./routes/productstats");
const orderstats = require("./routes/orderstats");
const orderRoutes = require("./routes/orders");
const homeSettingsRoutes = require("./routes/homesettings");

const app = express();

// --- Middleware ---
// Open CORS allows your Hostinger frontend to talk to this Render backend
app.use(cors()); 
app.use(express.json());

// --- Static Files ---
// Serves your jewellery images from the 'uploads' folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- API Routes ---
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/productstats", productstats);
app.use("/api/orderstats", orderstats);
app.use("/api/home-settings", homeSettingsRoutes);

// --- Health Check ---
app.get("/", (req, res) => {
  res.send("Bangalore Collective API is live and connected.");
});

// --- Server Startup (CRITICAL FOR RENDER) ---
// This uses the port Render assigns, or 5000 as a local fallback
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});