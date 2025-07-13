# api/index.py
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

def get_payment(creator_id, unit_id, quantity):
    url = "https://api.trakteer.id/v3/pay/xendit/qris"

    headers = {
        "User-Agent": "Dart/3.7 (dart:io)",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Encoding": "gzip",
        "Host": "api.trakteer.id"
    }

    payload = {
        "source": "android",
        "creator_id": creator_id,
        "unit_id": unit_id,
        "quantity": int(quantity),
        "times": "once",
        "payment_method": "qris",
        "guest_email": "handokd@gmail.com",
        "display_name": "Seseorang",
        "support_message": "Halo",
        "is_anonym": True,
        "is_private": True,
        "is_remember_next": True,
        "is_showing_email": True
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        data = response.json()
        return data.get("result", {}).get("checkout_url")
    else:
        print("Error:", response.status_code)
        print("Response:", response.text)
        return None

@app.route("/create_payment", methods=["GET"])
def create_payment_route():
    creator_id = request.args.get("creator_id")
    unit_id = request.args.get("unit_id")
    quantity = request.args.get("quantity", 1)

    if not creator_id or not unit_id:
        return jsonify({"error": "Missing creator_id or unit_id"}), 400

    checkout_url = get_payment(creator_id, unit_id, quantity)
    if checkout_url:
        return jsonify({"checkout_url": checkout_url})
    else:
        return jsonify({"error": "Failed to create payment"}), 500

# Ini wajib untuk Vercel (WSGI handler)
# Jangan panggil app.run()!
def handler(environ, start_response):
    return app(environ, start_response)
