// api/index.js
const express = require("express");
const fetch = require("node-fetch");

const app = express();

app.get("/create_payment", async (req, res) => {
  const creator_id = req.query.creator_id;
  const unit_id = req.query.unit_id;
  const quantity = parseInt(req.query.quantity || "1");

  if (!creator_id || !unit_id) {
    return res.status(400).json({ error: "Missing creator_id or unit_id" });
  }

  const url = "https://api.trakteer.id/v3/pay/xendit/qris";

  const headers = {
    "User-Agent": "Dart/3.7 (dart:io)",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Accept-Encoding": "gzip",
    "Host": "api.trakteer.id"
  };

  const payload = {
    source: "android",
    creator_id,
    unit_id,
    quantity,
    times: "once",
    payment_method: "qris",
    guest_email: "handokd@gmail.com",
    display_name: "Seseorang",
    support_message: "Halo",
    is_anonym: true,
    is_private: true,
    is_remember_next: true,
    is_showing_email: true
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      return res.json({ checkout_url: data?.result?.checkout_url });
    } else {
      console.error("API Error:", data);
      return res.status(500).json({ error: "Failed to create payment" });
    }
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Export handler for Vercel
module.exports = app;
