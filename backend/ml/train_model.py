"""
train_model.py  (v2 — improved accuracy)
-----------------------------------------
CHANGES FROM v1:
  - n_estimators raised from 200 → 300 (more trees = more reliable voting)
  - min_samples_leaf=2 added (prevents each tree from memorising tiny samples)
  - class_weight kept as 'balanced' (safety net even though data is now balanced)
  - Removed the UndefinedMetricWarning by adding zero_division=0 to the report
  - Prints a clean summary table at the end for your project report
"""

import os, sys
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "backend", "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def train(csv_file, target_col, model_file, features):
    print(f"\n{'='*55}\nTraining: {target_col.upper().replace('_', ' ')}\n{'='*55}")

    df = pd.read_csv(os.path.join(DATA_DIR, csv_file))
    X, y = df[features], df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc*100:.1f}%")
    print(classification_report(y_test, y_pred, zero_division=0))

    fi = pd.Series(clf.feature_importances_, index=features).sort_values(ascending=False)
    print("Feature importance:\n", fi.round(3))

    save_path = os.path.join(MODELS_DIR, model_file)
    joblib.dump({"model": clf, "features": features}, save_path)
    print(f"Saved → {save_path}")
    return acc


if __name__ == "__main__":
    results = {}

    results["Flood"] = train(
        "flood_data.csv", "flood_risk", "flood_model.pkl",
        ["rainfall_mm", "soil_saturation", "river_level_m", "elevation_m", "drainage_quality"]
    )
    results["Wildfire"] = train(
        "wildfire_data.csv", "wildfire_risk", "wildfire_model.pkl",
        ["temperature_c", "humidity_pct", "wind_speed_kmh", "vegetation_dryness", "rainfall_mm_7d"]
    )
    results["Heatwave"] = train(
        "heatwave_data.csv", "heatwave_risk", "heatwave_model.pkl",
        ["temperature_c", "humidity_pct", "wind_speed_kmh", "consecutive_hot_days", "night_temperature_c"]
    )

    print("\n" + "="*55)
    print("FINAL ACCURACY SUMMARY")
    print("="*55)
    for name, acc in results.items():
        bar = "█" * int(acc * 20)
        print(f"  {name:<10} {acc*100:5.1f}%  {bar}")
    print("="*55)
    print("All models trained and saved.")
