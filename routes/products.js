const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ GET ALL PRODUCTS
router.get("/", (req, res) => {
  const query = `
    SELECT 
      p.*, 
      (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url,
      (SELECT price FROM product_variations WHERE product_id = p.id LIMIT 1) AS variation_price
    FROM products p
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    
    const formattedProducts = results.map((product) => {
      // Find the price wherever it is hiding in the database!
      const actualPrice = product.variation_price || product.base_price || product.price || 0;
      
      return {
        ...product,
        price: actualPrice, 
        images: product.image_url ? [product.image_url] : []
      };
    });
    
    res.json(formattedProducts);
  });
});

// ✅ GET SINGLE PRODUCT BY ID
router.get("/:id", (req, res) => {
  const query = `
    SELECT 
      p.*, 
      (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url,
      (SELECT price FROM product_variations WHERE product_id = p.id LIMIT 1) AS variation_price
    FROM products p 
    WHERE p.id = ?
  `;

  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ error: "Product not found" });
    
    const product = results[0];
    
    // Find the price wherever it is hiding!
    product.price = product.variation_price || product.base_price || product.price || 0;
    product.images = product.image_url ? [product.image_url] : [];
    
    res.json(product);
  });
});

// ✅ UPDATE PRODUCT (✨ NEW FIX APPLIED HERE)
router.put("/:id", (req, res) => {
  const productId = req.params.id;

  // We extract exactly what React is sending
  const { name, sku, price, description } = req.body;
  const parsedPrice = parseFloat(price) || 0;

  // We use COALESCE so we don't accidentally erase your categories/brands!
  const query = `
    UPDATE products SET
      name = COALESCE(?, name),
      sku = COALESCE(?, sku),
      base_price = COALESCE(?, base_price),
      description = COALESCE(?, description)
    WHERE id = ?
  `;

  db.query(
    query,
    [name, sku, parsedPrice, description, productId],
    (err, result) => {
      if (err) return res.status(500).json(err);

      // ✨ THE FIX: We also update the hidden variations table so the old price stops overriding the new one!
      db.query(
        `UPDATE product_variations SET price = ? WHERE product_id = ?`,
        [parsedPrice, productId],
        (err2) => {
          if (err2) console.log("Failed to update variation price", err2);
          
          res.json({ message: "Product updated successfully" });
        }
      );
    }
  );
});

// ✅ DELETE PRODUCT
router.delete("/:id", (req, res) => {
  const productId = req.params.id;

  // 1. Delete images
  db.query("DELETE FROM product_images WHERE product_id = ?", [productId], (err) => {
    if (err) return res.status(500).json(err);

    // 2. Delete variations
    db.query("DELETE FROM product_variations WHERE product_id = ?", [productId], (err) => {
      if (err) return res.status(500).json(err);

      // 3. Delete product
      db.query("DELETE FROM products WHERE id = ?", [productId], (err2, result) => {
        if (err2) return res.status(500).json(err2);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted successfully" });
      });
    });
  });
});

// ✅ ADD PRODUCT 
router.post("/", (req, res) => {
  const {
    name,
    sku,
    price, 
    description,
    brand_id,
    category_id,
    subcategory_id,
    sub_subcategory_id,
    lifestyle_tag_id,
    variations,
    images 
  } = req.body;

  const productQuery = `
    INSERT INTO products 
    (name, sku, base_price, description, brand_id, category_id, subcategory_id, sub_subcategory_id, lifestyle_tag_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    productQuery,
    [
      name,
      sku,
      parseFloat(price) || 0, // Inserts the price into the DB
      description,
      brand_id || null,
      category_id || null,
      subcategory_id || null,
      sub_subcategory_id || null,
      lifestyle_tag_id || null
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      const productId = result.insertId;

      // ✅ 1. Save images
      if (images && images.length > 0) {
        const imageValues = images.map(url => [productId, url]);

        db.query(
          "INSERT INTO product_images (product_id, image_url) VALUES ?",
          [imageValues],
          (errImg) => {
            if (errImg) console.log("Image error:", errImg);
          }
        );
      }

      // ✅ 2. Save variations
      if (variations && variations.length > 0) {
        const values = variations.map(v => [
          productId,
          v.color_id || null,
          v.size_id || null,
          parseFloat(v.price) || parseFloat(price) || 0, 
          v.sale_price ? parseFloat(v.sale_price) : null,
          parseInt(v.stock) || 0
        ]);

        db.query(
          `INSERT INTO product_variations 
           (product_id, color_id, size_id, price, sale_price, stock) 
           VALUES ?`,
          [values],
          (err2) => {
            if (err2) return res.status(500).json(err2);
            res.status(201).json({ message: "Product created successfully" });
          }
        );
      } else {
        res.status(201).json({ message: "Product created successfully" });
      }
    }
  );
});

module.exports = router;