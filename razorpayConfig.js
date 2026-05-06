const Razorpay = require('razorpay');
require('dotenv').config();

// Initialize the instance with environment variables
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(), // .trim() ensures no hidden spaces
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});

module.exports = razorpayInstance;