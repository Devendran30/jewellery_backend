require('dotenv').config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use(express.json());

const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const brandRoutes = require("./routes/brands");
const subcategoryRoutes = require("./routes/subcategories");
const path = require("path");
const uploadRoutes = require("./routes/upload");
const authRoutes = require("./routes/auth");
const productstats = require("./routes/productstats");
const orderstats = require("./routes/orderstats");
const orderRoutes = require("./routes/orders");

// NEW: Import the Home Settings route
const homeSettingsRoutes = require("./routes/homesettings");

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/productstats", productstats);
app.use("/api/orderstats", orderstats);

// NEW: Tell Express to use the Home Settings route
app.use("/api/home-settings", homeSettingsRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});