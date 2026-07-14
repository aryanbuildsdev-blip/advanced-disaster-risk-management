"""
routes/auth.py
---------------
Handles everything related to user accounts:
  GET  /login   → show the login page
  POST /login   → check credentials, start session
  GET  /signup  → show the signup page
  POST /signup  → create a new account
  GET  /logout  → end the session, redirect to login

HOW SESSIONS WORK (beginner explanation):
When a user logs in, we store their user_id in Flask's 'session' object.
The session is like a secure cookie stored in the browser. On every future
request, Flask automatically reads that cookie and makes session['user_id']
available. When the user logs out, we clear the session cookie.
This is how almost every website on the internet keeps users "logged in."

HOW PASSWORDS ARE STORED (beginner explanation):
We NEVER store the actual password in the database. That's dangerously
insecure. Instead, we run the password through a one-way "hashing" function
(werkzeug.security.generate_password_hash). The hash looks like:
  scrypt:32768:8:1$...a very long string of random characters...
When the user tries to log in, we hash their typed password and compare
the hashes. The real password is never stored or transmitted.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import create_user, get_user_by_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    # If already logged in, send straight to dashboard
    if "user_id" in session:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email    = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        # Basic validation
        if not email or not password:
            flash("Please fill in all fields.", "warning")
            return render_template("login.html")

        user = get_user_by_email(email)
        if user and check_password_hash(user["password_hash"], password):
            # Correct credentials ─ start the session
            session.clear()
            session["user_id"]  = user["id"]
            session["username"] = user["username"]
            flash(f"Welcome back, {user['username']}!", "success")
            return redirect(url_for("dashboard"))
        else:
            flash("Incorrect email or password. Please try again.", "danger")

    return render_template("login.html")


@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():
    if "user_id" in session:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username  = request.form.get("username", "").strip()
        email     = request.form.get("email", "").strip()
        password  = request.form.get("password", "")
        password2 = request.form.get("password2", "")

        # Validation
        errors = []
        if not username or not email or not password:
            errors.append("All fields are required.")
        if len(username) < 3:
            errors.append("Username must be at least 3 characters.")
        if len(password) < 6:
            errors.append("Password must be at least 6 characters.")
        if password != password2:
            errors.append("Passwords do not match.")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template("signup.html",
                                   username=username, email=email)

        password_hash = generate_password_hash(password)
        success = create_user(username, email, password_hash)

        if success:
            flash("Account created! Please log in.", "success")
            return redirect(url_for("auth.login"))
        else:
            flash("That username or email is already registered.", "warning")

    return render_template("signup.html")


@auth_bp.route("/logout")
def logout():
    username = session.get("username", "")
    session.clear()
    flash(f"You have been logged out{', ' + username if username else ''}.", "info")
    return redirect(url_for("auth.login"))
