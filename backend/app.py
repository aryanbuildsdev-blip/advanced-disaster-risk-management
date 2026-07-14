"""
app.py  ─  backend/app.py
--------------------------
Main Flask application entry point. This file:
  1. Creates and configures the Flask app
  2. Registers the auth and API blueprints
  3. Initialises the database
  4. Defines the page routes (which HTML page to show for each URL)
  5. Starts the development server when run directly

PAGE ROUTES (return HTML):
  /             → redirects to dashboard or login
  /dashboard    → main prediction interface
  /map          → interactive Leaflet map
  /history      → logged-in user's prediction history

AUTH ROUTES (in routes/auth.py):
  /login  /signup  /logout

API ROUTES (in routes/api.py):
  /api/predict/<type>   /api/history   /api/stats   /api/health
"""

import os, sys

# Add the backend folder to Python's search path so imports like
# 'from routes.auth import auth_bp' work correctly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, redirect, url_for, session, flash

from routes.auth import auth_bp
from routes.api  import api_bp
from database.db import init_db

# ── path constants ────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))          # .../backend
PROJECT_ROOT = os.path.dirname(BASE_DIR)                            # .../disaster-risk-system
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

# ── create app ────────────────────────────────────────────────────────────────
app = Flask(
    __name__,
    template_folder=os.path.join(FRONTEND_DIR, "templates"),
    static_folder=os.path.join(FRONTEND_DIR, "static"),
)

# SECRET_KEY is required for session (login) cookies.
# Change this to a long random string before deploying!
app.config["SECRET_KEY"] = "disaster-risk-secret-key-change-in-production-2025"

# ── register blueprints ───────────────────────────────────────────────────────
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)

# ── initialise database ───────────────────────────────────────────────────────
with app.app_context():
    init_db()


# ── helper decorator ──────────────────────────────────────────────────────────
def login_required(f):
    """
    A 'decorator' that protects a route: if the user is not logged in,
    they get redirected to the login page instead of seeing the content.
    Usage: put @login_required above any route function you want to protect.
    """
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access that page.", "warning")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return decorated


# ── page routes ───────────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Homepage renders the onboarding landing page."""
    user = None
    if "user_id" in session:
        user = {"id": session["user_id"], "username": session.get("username")}
    return render_template("landing.html", user=user)


@app.route("/dashboard")
def dashboard():
    """
    Main prediction interface. Accessible without login, but prediction
    history saving only happens when logged in (shown as a banner).
    """
    user = None
    if "user_id" in session:
        user = {"id": session["user_id"], "username": session.get("username")}
    return render_template("dashboard.html", user=user)


@app.route("/map")
def map_page():
    """Interactive Leaflet.js risk map."""
    user = None
    if "user_id" in session:
        user = {"id": session["user_id"], "username": session.get("username")}
    return render_template("map.html", user=user)


@app.route("/history")
@login_required
def history():
    """Prediction history — login required."""
    user = {"id": session["user_id"], "username": session.get("username")}
    return render_template("history.html", user=user)


# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)
