// ==========================
// Zerotize Payment Gateway Backend
// Author: ChatGPT (For Raj ♥)
// ==========================

// INSTALL REQUIRED PACKAGES:
// npm i express axios body-parser uuid cors dotenv

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuid } = require("uuid");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ENV VARIABLES
const ACCOUNT_ID = process.env.ZEROTIZE_ACCOUNT_ID;
const SECRET_KEY = process.env.ZEROTIZE_SECRET_KEY;
const BASE_URL = "https://zerotize.in";

// LOCAL DATABASE (Use MongoDB in production)
let orders = {};

// ==========================
// 1) CREATE PAYMENT REQUEST
// ==========================
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, name, phone, email } = req.body;

    const payment_id = uuid(); // unique payment id

    const payload = {
      init_payment: {
        account_id: ACCOUNT_ID,
        secret_key: SECRET_KEY,
        payment_id,
        payment_amount: amount,
        payment_name: name || "",
        payment_phone: phone || "",
        payment_email: email || "",
        redirect_url: `https://yourdomain.com/payment-success?pid=${payment_id}`
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api_payment_init`,
      payload,
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    // Save order
    orders[payment_id] = {
      payment_id,
      amount,
      status: "PENDING"
    };

    res.json({
      success: true,
      payment_id,
      pay_url: response.data.payment_url, // Zerotize returns payment page
      raw: response.data
    });

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ error: "create_failed" });
  }
});


// ==========================
// 2) GET PAYMENT STATUS
// ==========================
app.get("/status/:pid", async (req, res) => {
  try {
    const payment_id = req.params.pid;

    const payload = {
      fetch_payment: {
        account_id: ACCOUNT_ID,
        secret_key: SECRET_KEY,
        payment_id
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api_payment_status`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    // Update local DB
    if (response.data.payment_status === "SUCCESS") {
      orders[payment_id].status = "SUCCESS";
    }

    res.json({
      payment_id,
      status: orders[payment_id]?.status || "UNKNOWN",
      raw: response.data
    });

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ error: "status_failed" });
  }
});


// ==========================
// 3) ALL ORDERS (DEV ONLY)
// ==========================
app.get("/orders", (req, res) => {
  res.json(orders);
});


// ==========================
app.listen(3000, () => {
  console.log("Zerotize backend running on port 3000");
});
