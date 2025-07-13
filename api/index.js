const express = require("express");
const fetch = require("node-fetch"); // Library untuk membuat HTTP requests

const app = express();
app.use(express.json()); // Middleware untuk parsing body JSON jika ada

// Endpoint 1: Membuat pembayaran Trakteer QRIS dan mendapatkan checkout_url
app.get("/api/create_payment", async (req, res) => {
  const creator_id = req.query.creator_id;
  const unit_id = req.query.unit_id;
  const quantity = parseInt(req.query.quantity || "1");

  // Validasi input
  if (!creator_id || !unit_id || isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Missing or invalid parameters: creator_id, unit_id, or quantity" });
  }

  const url = "https://api.trakteer.id/v3/pay/xendit/qris";

  const headers = {
    "User-Agent": "Dart/3.7 (dart:io)", // User-Agent ini meniru aplikasi Android
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Accept-Encoding": "gzip",
    "Host": "api.trakteer.id"
  };

  // Payload untuk permintaan pembuatan pembayaran
  const payload = {
    source: "android", // Menunjukkan permintaan berasal dari platform Android
    creator_id,
    unit_id,
    quantity,
    times: "once",
    payment_method: "qris",
    guest_email: "handokd@gmail.com", // Email statis, bisa diganti dengan yang dinamis
    display_name: "Seseorang", // Nama statis
    support_message: "Halo", // Pesan dukungan statis
    is_anonym: true,
    is_private: true,
    is_remember_next: true,
    is_showing_email: true
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      timeout: 15000 // Timeout 15 detik
    });

    const data = await response.json();

    if (response.ok) {
      // Jika respons sukses, kirim checkout_url ke klien
      return res.json({ checkout_url: data?.result?.checkout_url });
    } else {
      // Jika ada error dari API Trakteer
      console.error("Trakteer API Error:", data);
      return res.status(response.status).json({ error: data.message || "Failed to create payment" });
    }
  } catch (err) {
    // Jika ada error di sisi server atau koneksi
    console.error("Server Error creating payment:", err);
    return res.status(500).json({ error: "Internal Server Error during payment creation" });
  }
});

// Endpoint 2: Mengambil QRIS string dari checkout_url
app.get("/api/get_qris_string", async (req, res) => {
  const checkout_url = req.query.checkout_url;

  // Validasi input
  if (!checkout_url) {
    return res.status(400).json({ error: "Missing checkout_url parameter" });
  }

  // Header untuk meniru browser seluler
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
  };

  try {
    const response = await fetch(checkout_url, {
      headers,
      timeout: 15000 // Timeout 15 detik
    });

    if (!response.ok) {
      // Jika gagal mengambil halaman checkout
      console.error(`Failed to fetch checkout page: ${response.status} ${response.statusText}`);
      return res
        .status(response.status)
        .json({ error: "Failed to fetch checkout page" });
    }

    const html = await response.text();

    // Menggunakan regex untuk mengekstrak dataUrl (QRIS string)
    // Perhatikan bahwa saya mengganti '' dengan '\u0027' karena itu adalah karakter apostrof (')
    // Ini penting agar regex bekerja dengan benar pada JavaScript.
    const match = html.match(/var dataUrl = decodeURI\('([^']+)'\)/);
    const qrisString = match ? match[1] : null;

    if (qrisString) {
      // Jika QRIS string ditemukan, kirim ke klien
      return res.status(200).json({ qris: qrisString });
    } else {
      // Jika QRIS string tidak ditemukan
      console.error("QRIS string not found in HTML for:", checkout_url);
      return res.status(404).json({ error: "QRIS string not found in HTML" });
    }
  } catch (error) {
    // Jika ada error di sisi server atau koneksi
    console.error("Server Error getting QRIS string:", error);
    return res.status(500).json({ error: "Internal Server Error during QRIS string retrieval" });
  }
});

// Export aplikasi Express untuk Vercel
module.exports = app;
