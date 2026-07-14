# 🌍 Advanced AI-Based Multi-Disaster Risk Assessment & WebGL 3D Simulation Platform
**Final Year Project / Advanced Disaster Risk Management**

---

## 📖 Overview
An advanced end-to-end hybrid framework merging **Random Forest Classifier Machine Learning** with real-time **WebGL 3D Physics-Based Simulations** to evaluate and visualize natural environmental hazards.

The platform monitors three core natural disasters:
- 🌊 **Flood Risk**: Analyzes rainfall, soil moisture, river levels, elevation, and drainage quality using Green-Ampt hydrological physics.
- 🔥 **Wildfire Risk**: Estimates combustion rate of spread (ROS) based on air temperature, relative humidity, wind velocity, and fuel dryness index.
- ☀️ **Heatwave Risk**: Measures apparent temperature and Wet Bulb Globe Temperature (WBGT) heat stress.

---

## ✨ System Features

### 1. Welcome Landing Page (`/`)
An immersive welcome portal explaining the hybrid science, describing system capabilities, and directing users to register, log in, or explore the dashboard as a guest.

### 2. Cinematic Logo Splash Screen
A Netflix/Prime Video style startup intro that plays on initial entrance to the site. The text "Disaster" slides in, followed by a bright neon blue "AI" pop-in and a hardware-accelerated glowing radial pulse.

### 3. Open-Meteo Live API Telemetry Sync
Query real-world measurements for any location globally via:
- Browser GPS Geolocation detection.
- Search box querying the Open-Meteo Geocoding engine.
Automatically updates inputs for temperature, wind, humidity, 24h & 7-day rainfall history, soil moisture, and elevations.

### 4. Interactive 3D WebGL Physics Models
Interactive 3D scenes rendered in the browser at 60 FPS using **Three.js** and **OrbitControls** (click and drag to **rotate**, mouse wheel to **zoom**, right-click to **pan**):
- **3D Flood Infiltration Terrain**: Renders a mountain landscape with a house. Volumetric blue water rises/falls and 3D rain streams from the clouds.
- **3D Wildfire CA Voxel Forest**: Renders an 8x8 voxel grid of tree shapes (trunk and green foliage). Burning trees flicker, spread fires based on wind direction, and collapse into ash stumps. Click the grid to drop fire sparks!
- **3D Thermodynamic Comfort Mannequin**: Renders a stylized humanoid mannequin. Its body color shifts like an infrared thermal camera based on heat stress. Includes 3D solar rays and sweating particle emitters.

### 5. High-Tech Leaflet Dark Map (`/map`)
A CartoDB Dark Matter base layer displaying risk circles in parallel. Click *any coordinate on Earth* to drop a custom pin, fetch live weather, run predictions, and display results in a glassmorphic Leaflet popup.

### 6. Secure Database Audit Log (`/history`)
A database ledger page saving query parameters, risk levels, and confidence probabilities into an SQLite database per authenticated user.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **ML Models** | Stratified Random Forest Classifiers (scikit-learn) |
| **Backend** | Python + Flask |
| **Database** | SQLite3 |
| **Frontend** | HTML5 + Custom CSS Glassmorphism + JavaScript |
| **3D Rendering** | Three.js + WebGL + OrbitControls |
| **Global Map** | Leaflet.js + CartoDB Dark Matter Tiles |
| **Charts** | Chart.js |

---

## 🚀 How to Run

### Step 1 — Clone the Repository
```bash
git clone https://github.com/aryanbuildsdev-blip/advanced-disaster-risk-management.git
cd advanced-disaster-risk-management
```

### Step 2 — Install Python Packages
```bash
pip install -r requirements.txt
```

### Step 3 — Generate Sample Data & Train Models
*(Optional: Pre-trained models are already included in backend/models)*
```bash
python data/generate_sample_data.py
python backend/ml/train_model.py
```

### Step 4 — Start the Server
```bash
python run.py
```

### Step 5 — Open Your Browser
Go to: **http://127.0.0.1:5000**
