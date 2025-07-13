const express = require("express");
const fetch = require("node-fetch");
const { CookieJar } = require('tough-cookie'); // Membutuhkan instalasi tough-cookie
const { HttpCookieAgent, HttpsCookieAgent } = require('http-cookie-agent/legacy'); // Membutuhkan instalasi http-cookie-agent/legacy

const app = express();
app.use(express.json());

// Endpoint 1: Membuat pembayaran Trakteer QRIS dan mendapatkan checkout_url
app.get("/api/create_payment", async (req, res) => {
  const creator_id = req.query.creator_id;
  const unit_id = req.query.unit_id;
  const quantity = parseInt(req.query.quantity || "1");

  if (!creator_id || !unit_id || isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Missing or invalid parameters: creator_id, unit_id, or quantity" });
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
      body: JSON.stringify(payload),
      timeout: 15000
    });

    const data = await response.json();

    if (response.ok) {
      return res.json({ checkout_url: data?.result?.checkout_url });
    } else {
      console.error("Trakteer API Error (create_payment):", data);
      return res.status(response.status).json({ error: data.message || "Failed to create payment" });
    }
  } catch (err) {
    console.error("Server Error creating payment:", err);
    return res.status(500).json({ error: "Internal Server Error during payment creation" });
  }
});

// Endpoint 2: Mengambil QRIS string dari checkout_url dengan inisialisasi sesi
app.get("/api/get_qris_string", async (req, res) => {
  const checkout_url = req.query.checkout_url;

  if (!checkout_url) {
    return res.status(400).json({ error: "Missing checkout_url parameter" });
  }

  // --- Inisialisasi Cookie Jar dan Agent untuk Sesi ---
  const cookieJar = new CookieJar();
  const httpAgent = new HttpCookieAgent({ cookies: cookieJar });
  const httpsAgent = new HttpsCookieAgent({ cookies: cookieJar });

  const session_headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive"
  };

  try {
    // --- Langkah 1: Inisialisasi sesi dengan https://trakteer.id/forumkt ---
    const forumUrl = "https://trakteer.id/forumkt";
    console.log(`Menginisialisasi sesi dengan ${forumUrl}`);
    const initResponse = await fetch(forumUrl, {
      agent: forumUrl.startsWith('https') ? httpsAgent : httpAgent,
      headers: session_headers,
      timeout: 15000
    });
    initResponse.raiseForStatus; // pastikan respons sukses
    console.log("Sesi Trakteer berhasil diinisialisasi.");


    // --- Langkah 2: Mengambil HTML dari checkout_url menggunakan sesi yang sama ---
    console.log(`Mengambil HTML dari checkout_url: ${checkout_url}`);
    const checkoutResponse = await fetch(checkout_url, {
      agent: checkout_url.startsWith('https') ? httpsAgent : httpAgent,
      headers: session_headers,
      timeout: 15000
    });

    if (!checkoutResponse.ok) {
      console.error(`Failed to fetch checkout page: ${checkoutResponse.status} ${checkoutResponse.statusText}`);
      return res.status(checkoutResponse.status).json({ error: "Failed to fetch checkout page" });
    }

    const html = await checkoutResponse.text();

    const match = html.match(/var dataUrl = decodeURI\('([^']+)'\)/);
    const qrisString = match ? match[1] : null;

    if (qrisString) {
      return res.status(200).json({ qris: qrisString });
    } else {
      console.error("QRIS string not found in HTML for:", checkout_url);
      return res.status(404).json({ error: "QRIS string not found in HTML" });
    }
  } catch (error) {
    console.error("Server Error getting QRIS string with session:", error);
    return res.status(500).json({ error: "Internal Server Error during QRIS string retrieval with session" });
  }
});

module.exports = app;
