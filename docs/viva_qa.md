# Viva Questions & Answers
## AI-Based Multi-Disaster Risk Assessment and Early Warning System

---

**Q1. What is the objective of your project?**
To build an AI-powered web application that predicts disaster risk levels (Low/Medium/High) for floods, wildfires, and heatwaves using machine learning, and displays results on an interactive map with a full-stack dashboard.

---

**Q2. Which ML algorithm did you use and why?**
Random Forest Classifier. It builds many decision trees and takes a majority vote, which reduces errors compared to a single tree. It works well on tabular (numerical) data, doesn't require a GPU, and provides feature importance — showing which inputs (e.g., rainfall) matter most.

---

**Q3. Why didn't you include earthquake prediction?**
Earthquake prediction is not scientifically feasible. No method can reliably predict the exact time, location, and magnitude of an earthquake — this is the settled consensus in seismology. Real systems like USGS use earthquake monitoring and early warning (detecting that shaking has started, then alerting before it spreads). Our system follows the same scientific approach.

---

**Q4. How does the prediction pipeline work end-to-end?**
User inputs values on the dashboard → JavaScript sends a POST request to /api/predict/<type> → Flask receives it → the trained .pkl model is loaded → input values are arranged in the correct feature order → model.predict() runs → risk level and confidence probabilities are returned as JSON → JavaScript shows the result and draws the Chart.js chart.

---

**Q5. What is a Random Forest and how does it differ from a single Decision Tree?**
A Decision Tree asks yes/no questions about data to reach a prediction. One tree can overfit (memorise training data instead of learning). A Random Forest builds 300 such trees, each on a slightly different random subset of the data, then takes a majority vote. This makes predictions more reliable and resistant to overfitting.

---

**Q6. What is overfitting and how did you handle it?**
Overfitting is when the model memorises training data perfectly but performs poorly on new data. We handled it by: (1) setting max_depth=12 to limit how deep each tree can grow; (2) using min_samples_leaf=2 so each leaf must have at least 2 examples; (3) testing on a held-out 20% test set the model never trained on.

---

**Q7. How is user data secured?**
Passwords are never stored as plain text. We use Werkzeug's generate_password_hash() which applies the scrypt algorithm — a one-way cryptographic function. Even if the database is stolen, passwords cannot be recovered. Sessions are managed using Flask's signed cookie system with a secret key.

---

**Q8. What database did you use and why SQLite?**
SQLite — a file-based relational database built into Python (no separate server needed). It stores users and prediction history in a single .db file. For a final-year project or small deployment, SQLite is ideal. For a production system with many users, we would swap to PostgreSQL by updating the connection string in db.py.

---

**Q9. Explain the class imbalance problem and how you solved it.**
In the first version, the synthetic data generated very few "High" risk examples, so the model almost never predicted "High". We fixed this using pd.qcut() instead of pd.cut() — quantile-based cutting guarantees exactly equal numbers of Low, Medium, and High examples (1000 each), so the model sees enough of every class to learn it properly.

---

**Q10. What is feature importance and what did your models show?**
Feature importance tells us how much each input variable contributed to the model's decisions. For flood: rainfall_mm was most important. For wildfire: temperature and humidity were dominant. For heatwave: temperature and consecutive_hot_days had the highest importance. This is visible in the terminal output when you run train_model.py.

---

**Q11. How does the interactive map work?**
Leaflet.js (a free JavaScript mapping library) renders the map using OpenStreetMap tiles. For each of 15 Indian cities, the JavaScript sends a POST request to the prediction API with that city's realistic weather conditions. The returned risk level determines the marker colour (green/yellow/red). All 15 API calls run in parallel using Promise.all() so the map loads quickly.

---

**Q12. How would you deploy this for real users?**
We would deploy on Render.com (free tier). Steps: push code to GitHub, connect GitHub to Render, set the start command to `python run.py`, set environment variables (SECRET_KEY, etc.). For production, we would also switch from SQLite to PostgreSQL, turn off debug mode, and add HTTPS.

---

**Q13. What are the limitations of your current system?**
(1) Synthetic training data — a production system needs real historical data from IMD, NASA, or Kaggle. (2) SQLite is not suitable for many concurrent users. (3) The system predicts risk for manually entered conditions, not live weather feeds (future work: integrate OpenWeatherMap API). (4) No email alerts yet — a future module would send warnings to registered users.

---

**Q14. What is a REST API and how did you implement one?**
REST (Representational State Transfer) is a standard way for a frontend and backend to communicate over HTTP. We implemented it using Flask route decorators. Example: POST /api/predict/flood accepts JSON input and returns JSON output. This design means the frontend (JavaScript) and backend (Python) are fully independent and could be replaced separately.

---

**Q15. What future improvements would you add?**
(1) Real-time weather data from OpenWeatherMap or IMD API. (2) Email/SMS alerts when risk exceeds a threshold. (3) Time-series prediction using LSTM (for forecasting risk over next 24-72 hours). (4) Satellite imagery analysis using CNN for wildfire detection. (5) Mobile app using React Native.
