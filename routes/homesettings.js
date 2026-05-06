const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// IMPORTANT: Import your MySQL database connection
const db = require("../db");

// The file where Instagram settings will be saved
const INSTA_SETTINGS_FILE = path.join(__dirname, "../insta_settings.json");

// --- GET ROUTE: Fetch from both DB and File ---
router.get("/", (req, res) => {
    // 1. Fetch Promotional Cards from MySQL
    const query = "SELECT promo_cards FROM home_settings WHERE id = 1";
    
    db.query(query, (err, dbResults) => {
        let cards = [];
        
        if (!err && dbResults.length > 0) {
            try {
                cards = typeof dbResults[0].promo_cards === 'string' 
                    ? JSON.parse(dbResults[0].promo_cards) 
                    : dbResults[0].promo_cards;
            } catch (e) {
                console.error("Error parsing promo cards:", e);
            }
        }

        // 2. Fetch Instagram Settings from the JSON file
        let insta = { links: [], isActive: true };
        try {
            if (fs.existsSync(INSTA_SETTINGS_FILE)) {
                const fileData = fs.readFileSync(INSTA_SETTINGS_FILE, "utf8");
                insta = JSON.parse(fileData);
            }
        } catch (fileErr) {
            console.error("Error reading Insta file:", fileErr);
        }

        // Send the combined data back to the frontend
        res.json({ insta, cards });
    });
});


// --- POST ROUTE: Save to both DB and File ---
router.post("/update", (req, res) => {
    const { insta, cards } = req.body;

    // 1. Save Promotional Cards to MySQL
    const cardsData = JSON.stringify(cards || []);
    
    // Notice we only update the promo_cards column now
    const query = `
        INSERT INTO home_settings (id, promo_cards) 
        VALUES (1, ?) 
        ON DUPLICATE KEY UPDATE promo_cards = VALUES(promo_cards)
    `;

    db.query(query, [cardsData], (dbErr, results) => {
        if (dbErr) {
            console.error("Failed to save cards to DB:", dbErr);
            return res.status(500).json({ error: "Database update failed" });
        }

        // 2. Save Instagram Links to the JSON file
        const newInstaSettings = {
            links: insta.links || [],
            isActive: insta.isActive ?? true
        };

        fs.writeFile(INSTA_SETTINGS_FILE, JSON.stringify(newInstaSettings, null, 2), "utf8", (fileErr) => {
            if (fileErr) {
                console.error("Failed to save Insta file:", fileErr);
                return res.status(500).json({ error: "File update failed" });
            }
            
            // Success! Both DB and File are updated.
            res.json({ message: "Storefront updated successfully!" });
        });
    });
});

module.exports = router;