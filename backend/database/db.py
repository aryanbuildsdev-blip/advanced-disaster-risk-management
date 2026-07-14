"""
db.py  ─  database/db.py
-------------------------
ALL database interaction lives here. The rest of the app never writes raw
SQL ─ it calls these helper functions. This separation makes it easy to
swap SQLite for PostgreSQL later (just update the functions here, nothing
else changes).

WE USE:  sqlite3  (built into Python, zero installation needed)
DATABASE FILE STORED AT:  backend/database/disaster_risk.db

TABLES:
  users        ─ one row per registered account
  predictions  ─ one row per prediction made by a logged-in user
"""

import sqlite3
import os
from datetime import datetime

# Path is always relative to THIS file, no matter where the server is run from.
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disaster_risk.db")


# ── connection helper ────────────────────────────────────────────────────────
def get_db():
    """
    Opens and returns a connection to the SQLite database.
    conn.row_factory = sqlite3.Row lets us access columns by NAME (row['email'])
    instead of position (row[1]) ─ much easier to work with.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── schema creation ──────────────────────────────────────────────────────────
def init_db():
    """
    Creates the tables if they don't already exist.
    Called once when the Flask app starts.
    'IF NOT EXISTS' means it's safe to call on every startup ─ it won't
    wipe data or crash if the tables are already there.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    UNIQUE NOT NULL,
            email         TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            created_at    TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS predictions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL,
            disaster_type    TEXT    NOT NULL,
            risk_level       TEXT    NOT NULL,
            confidence_json  TEXT    NOT NULL,
            input_data_json  TEXT    NOT NULL,
            location_name    TEXT    DEFAULT 'Manual Input',
            created_at       TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    conn.close()
    print("[DB] Tables initialised.")


# ── user functions ───────────────────────────────────────────────────────────
def create_user(username, email, password_hash):
    """
    Inserts a new user row.
    Returns True on success, False if username/email already exists.
    """
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username.strip(), email.strip().lower(), password_hash)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        # Triggered when username OR email violates the UNIQUE constraint
        return False


def get_user_by_email(email):
    """Returns the user row for the given email, or None if not found."""
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email = ?", (email.strip().lower(),)
    ).fetchone()
    conn.close()
    return user


def get_user_by_id(user_id):
    """Returns a user row by primary key, or None."""
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return user


# ── prediction history functions ─────────────────────────────────────────────
def save_prediction(user_id, disaster_type, risk_level,
                    confidence_json, input_data_json, location_name="Manual Input"):
    """
    Saves one completed prediction to the predictions table.
    Only called when a user is logged in (session has user_id).
    """
    conn = get_db()
    conn.execute(
        """INSERT INTO predictions
           (user_id, disaster_type, risk_level, confidence_json,
            input_data_json, location_name)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, disaster_type, risk_level,
         confidence_json, input_data_json, location_name)
    )
    conn.commit()
    conn.close()


def get_user_predictions(user_id, disaster_type=None, limit=100):
    """
    Returns the prediction history for a user, newest first.
    If disaster_type is given (e.g. 'flood'), only that type is returned.
    """
    conn = get_db()
    if disaster_type and disaster_type != "all":
        rows = conn.execute(
            """SELECT * FROM predictions
               WHERE user_id = ? AND disaster_type = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, disaster_type, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT * FROM predictions
               WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]   # convert sqlite3.Row → plain dict


def clear_user_predictions(user_id):
    """Deletes all prediction history for a user."""
    conn = get_db()
    conn.execute("DELETE FROM predictions WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


def get_prediction_stats(user_id):
    """
    Returns aggregate stats for the dashboard summary cards:
      - total predictions per disaster type
      - last risk level for each type
    """
    conn = get_db()
    rows = conn.execute(
        """SELECT disaster_type,
                  COUNT(*) as total,
                  MAX(created_at) as last_run,
                  (SELECT risk_level FROM predictions p2
                   WHERE p2.user_id = p1.user_id
                     AND p2.disaster_type = p1.disaster_type
                   ORDER BY created_at DESC LIMIT 1) as last_risk
           FROM predictions p1
           WHERE user_id = ?
           GROUP BY disaster_type""",
        (user_id,)
    ).fetchall()
    conn.close()
    return {r["disaster_type"]: dict(r) for r in rows}
