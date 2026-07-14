"""
routes/api.py
--------------
All JSON API endpoints. These are called by JavaScript in the browser
(not by a human typing a URL). They always return JSON, never HTML.

ENDPOINTS:
  POST /api/predict/<disaster_type>  → run an ML prediction
  GET  /api/history                  → get logged-in user's history
  POST /api/history/clear            → clear logged-in user's history
  GET  /api/stats                    → get prediction stats for dashboard cards

WHY A SEPARATE FILE?
Keeping API routes separate from page routes (in app.py) and auth routes
(in auth.py) makes the code easier to navigate and maintain. If something
breaks in the prediction logic, you know exactly which file to check.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import joblib
import pandas as pd
from flask import Blueprint, jsonify, request, session

from database.db import (
    save_prediction, get_user_predictions,
    clear_user_predictions, get_prediction_stats
)

api_bp = Blueprint("api", __name__)

# ── Load trained ML models (once, when this module is imported) ───────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODELS     = {}

for dtype, fname in [
    ("flood",    "flood_model.pkl"),
    ("wildfire", "wildfire_model.pkl"),
    ("heatwave", "heatwave_model.pkl"),
]:
    path = os.path.join(MODELS_DIR, fname)
    if os.path.exists(path):
        MODELS[dtype] = joblib.load(path)
        print(f"[OK] Model loaded: {dtype}")
    else:
        print(f"[WARN] Model not found: {path}")


# ── /api/predict/<disaster_type> ─────────────────────────────────────────────
@api_bp.route("/api/predict/<disaster_type>", methods=["POST"])
def predict(disaster_type):
    """
    Receives a JSON body with the input features, runs the model,
    returns the predicted risk level + confidence percentages.
    Saves the result to the database if the user is logged in.
    """
    if disaster_type not in MODELS:
        return jsonify({
            "error": f"Unknown disaster type '{disaster_type}'. "
                     f"Available: {list(MODELS.keys())}"
        }), 400

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    bundle   = MODELS[disaster_type]
    model    = bundle["model"]
    features = bundle["features"]

    missing = [f for f in features if f not in data]
    if missing:
        return jsonify({
            "error": f"Missing fields: {missing}",
            "required": features
        }), 400

    try:
        row = {f: float(data[f]) for f in features}
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"All fields must be numbers. ({e})"}), 400

    input_df = pd.DataFrame([row], columns=features)

    predicted = model.predict(input_df)[0]
    probs     = model.predict_proba(input_df)[0]
    confidence = {
        cls: round(float(p) * 100, 1)
        for cls, p in zip(model.classes_, probs)
    }

    location_name = data.get("location_name", "Manual Input")

    # Save to DB only when logged in
    if "user_id" in session:
        save_prediction(
            user_id         = session["user_id"],
            disaster_type   = disaster_type,
            risk_level      = predicted,
            confidence_json = json.dumps(confidence),
            input_data_json = json.dumps(row),
            location_name   = location_name,
        )

    return jsonify({
        "disaster_type": disaster_type,
        "risk_level":    predicted,
        "confidence":    confidence,
        "input_used":    row,
        "saved":         "user_id" in session,
    })


# ── /api/history ─────────────────────────────────────────────────────────────
@api_bp.route("/api/history")
def history():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401

    dtype = request.args.get("type", "all")
    rows  = get_user_predictions(session["user_id"], disaster_type=dtype)

    # Parse the JSON strings back into dicts so the frontend gets real objects
    for r in rows:
        try:
            r["confidence"] = json.loads(r["confidence_json"])
            r["input_data"] = json.loads(r["input_data_json"])
        except Exception:
            pass

    return jsonify({"predictions": rows, "count": len(rows)})


# ── /api/history/clear ────────────────────────────────────────────────────────
@api_bp.route("/api/history/clear", methods=["POST"])
def clear_history():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    clear_user_predictions(session["user_id"])
    return jsonify({"message": "History cleared."})


# ── /api/stats ────────────────────────────────────────────────────────────────
@api_bp.route("/api/stats")
def stats():
    """Returns per-disaster-type summary used by the dashboard stat cards."""
    if "user_id" not in session:
        return jsonify({"stats": {}})
    return jsonify({"stats": get_prediction_stats(session["user_id"])})


# ── /api/health ───────────────────────────────────────────────────────────────
@api_bp.route("/api/health")
def health():
    return jsonify({
        "status":        "ok",
        "models_loaded": list(MODELS.keys()),
        "logged_in":     "user_id" in session,
    })
