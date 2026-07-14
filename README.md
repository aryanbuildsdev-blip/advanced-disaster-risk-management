# AI-Based Multi-Disaster Risk Assessment and Early Warning System
**Final Year Project**

---

## What This System Does
An end-to-end AI web application that predicts disaster risk levels (Low / Medium / High) for:
- **Flood** — based on rainfall, soil saturation, river level, elevation, drainage quality
- **Wildfire** — based on temperature, humidity, wind speed, vegetation dryness, recent rainfall
- **Heatwave** — based on temperature, humidity, wind speed, consecutive hot days, night temperature

**Note on Earthquakes:** Earthquake prediction is scientifically impossible with current technology. This system instead monitors seismic data — consistent with real-world systems like USGS and Japan Meteorological Agency.

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| ML Models | Random Forest Classifier (scikit-learn) |
| Backend | Python + Flask |
| Database | SQLite (built-in Python) |
| Frontend | HTML5 + Bootstrap 5 + JavaScript |
| Map | Leaflet.js (15 Indian cities) |
| Charts | Chart.js |
| Auth | Flask sessions + Werkzeug password hashing |

---

## How to Run (Step by Step)

### Step 1 — Install Python
Download from python.org. During install, **tick "Add Python to PATH"**.

### Step 2 — Open terminal in this folder
In VS Code: File → Open Folder → select `disaster-risk-system` → Terminal → New Terminal

### Step 3 — Install packages
```
pip install -r requirements.txt
```

### Step 4 — Generate training data
```
python data/generate_sample_data.py
```

### Step 5 — Train the ML models
```
python backend/ml/train_model.py
```

### Step 6 — Start the server
```
python run.py
```

### Step 7 — Open your browser
Go to: **http://127.0.0.1:5000**

---

## Project Structure
```
disaster-risk-system/
├── run.py                          ← START HERE (runs the server)
├── requirements.txt                ← Python packages needed
├── data/
│   ├── generate_sample_data.py    ← Creates training CSVs
│   ├── flood_data.csv
│   ├── wildfire_data.csv
│   └── heatwave_data.csv
├── backend/
│   ├── app.py                     ← Main Flask app
│   ├── models/                    ← Trained .pkl model files
│   ├── ml/
│   │   └── train_model.py         ← Trains the 3 ML models
│   ├── database/
│   │   └── db.py                  ← SQLite database functions
│   └── routes/
│       ├── auth.py                ← Login / Signup / Logout
│       └── api.py                 ← Prediction & History API
├── frontend/
│   ├── templates/
│   │   ├── base.html              ← Shared navbar + layout
│   │   ├── dashboard.html         ← Main prediction interface
│   │   ├── map.html               ← Interactive Leaflet map
│   │   ├── history.html           ← Prediction history table
│   │   ├── login.html
│   │   └── signup.html
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── main.js            ← Dashboard logic + Chart.js
│           └── map.js             ← Leaflet map + 15 cities
└── docs/
    └── viva_qa.md                 ← Viva questions & answers
```

---

## Features
- ✅ 3 trained ML models (Random Forest, ~80% accuracy)
- ✅ REST API for predictions
- ✅ User registration & login (password hashing)
- ✅ Prediction history saved per user
- ✅ Interactive map — 15 Indian cities with live risk markers
- ✅ Chart.js confidence visualization
- ✅ Fully responsive (works on mobile)
- ✅ SQLite database (zero setup)
