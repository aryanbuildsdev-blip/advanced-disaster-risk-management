"""
generate_sample_data.py  (v2 — fixed class imbalance)
-------------------------------------------------------
WHAT CHANGED FROM v1:
In v1 we used fixed thresholds (risk_score < 0.33 = Low, etc.) to assign
risk labels. The problem: the risk_score calculations naturally produce
values clustered in the LOW-MEDIUM range, leaving very few "High" examples.
This caused the ML model to almost never predict "High" — useless in practice.

FIX APPLIED:
We now use pd.qcut() instead of pd.cut(). The "q" stands for quantile.
pd.qcut(risk_score, q=3, ...) automatically finds the thresholds that split
the data into EQUAL THIRDS — always exactly 33% Low, 33% Medium, 33% High.
This guarantees the model sees enough examples of EVERY risk class during
training and learns to predict all three reliably.

This is a standard technique in data science called "balanced class distribution."
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
N_SAMPLES = 3000          # increased from 2000 for better model learning
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_flood_data(n=N_SAMPLES):
    rainfall_mm      = np.random.gamma(shape=2.0, scale=45, size=n)
    soil_saturation  = np.clip(np.random.normal(50, 22, n), 0, 100)
    river_level_m    = np.clip(np.random.normal(3, 1.8, n), 0, 12)
    elevation_m      = np.clip(np.random.normal(150, 110, n), 0, 600)
    drainage_quality = np.random.randint(0, 11, n)

    risk_score = (
        0.35 * (rainfall_mm / (rainfall_mm.max() + 1e-9)) +
        0.25 * (soil_saturation / 100) +
        0.20 * (river_level_m / (river_level_m.max() + 1e-9)) -
        0.10 * (elevation_m / (elevation_m.max() + 1e-9)) -
        0.10 * (drainage_quality / 10)
    ) + np.random.normal(0, 0.04, n)

    # KEY FIX: qcut = quantile-based cut → always equal class sizes
    risk_label = pd.qcut(risk_score, q=3, labels=["Low", "Medium", "High"])

    return pd.DataFrame({
        "rainfall_mm":       rainfall_mm.round(1),
        "soil_saturation":   soil_saturation.round(1),
        "river_level_m":     river_level_m.round(2),
        "elevation_m":       elevation_m.round(1),
        "drainage_quality":  drainage_quality,
        "flood_risk":        risk_label,
    })


def generate_wildfire_data(n=N_SAMPLES):
    temperature_c      = np.random.normal(28, 9, n)
    humidity_pct       = np.clip(np.random.normal(45, 22, n), 1, 100)
    wind_speed_kmh     = np.clip(np.random.gamma(2, 9, n), 0, 90)
    vegetation_dryness = np.clip(np.random.normal(5, 2.8, n), 0, 10)
    rainfall_mm_7d     = np.random.gamma(1.5, 16, n)

    risk_score = (
        0.30 * (temperature_c / (temperature_c.max() + 1e-9)) +
        0.25 * (1 - humidity_pct / 100) +
        0.20 * (wind_speed_kmh / (wind_speed_kmh.max() + 1e-9)) +
        0.20 * (vegetation_dryness / 10) -
        0.15 * (rainfall_mm_7d / (rainfall_mm_7d.max() + 1e-9))
    ) + np.random.normal(0, 0.04, n)

    risk_label = pd.qcut(risk_score, q=3, labels=["Low", "Medium", "High"])

    return pd.DataFrame({
        "temperature_c":      temperature_c.round(1),
        "humidity_pct":       humidity_pct.round(1),
        "wind_speed_kmh":     wind_speed_kmh.round(1),
        "vegetation_dryness": vegetation_dryness.round(1),
        "rainfall_mm_7d":     rainfall_mm_7d.round(1),
        "wildfire_risk":      risk_label,
    })


def generate_heatwave_data(n=N_SAMPLES):
    temperature_c         = np.random.normal(34, 7, n)
    humidity_pct          = np.clip(np.random.normal(55, 22, n), 1, 100)
    wind_speed_kmh        = np.clip(np.random.gamma(2, 7, n), 0, 70)
    consecutive_hot_days  = np.random.poisson(3, n)
    night_temperature_c   = temperature_c - np.random.normal(8, 3, n)

    risk_score = (
        0.30 * (temperature_c / (temperature_c.max() + 1e-9)) +
        0.20 * (humidity_pct / 100) -
        0.15 * (wind_speed_kmh / (wind_speed_kmh.max() + 1e-9)) +
        0.20 * (consecutive_hot_days / (consecutive_hot_days.max() + 1e-9)) +
        0.15 * (night_temperature_c / (night_temperature_c.max() + 1e-9))
    ) + np.random.normal(0, 0.04, n)

    risk_label = pd.qcut(risk_score, q=3, labels=["Low", "Medium", "High"])

    return pd.DataFrame({
        "temperature_c":         temperature_c.round(1),
        "humidity_pct":          humidity_pct.round(1),
        "wind_speed_kmh":        wind_speed_kmh.round(1),
        "consecutive_hot_days":  consecutive_hot_days,
        "night_temperature_c":   night_temperature_c.round(1),
        "heatwave_risk":         risk_label,
    })


if __name__ == "__main__":
    for name, df in [
        ("flood",    generate_flood_data()),
        ("wildfire", generate_wildfire_data()),
        ("heatwave", generate_heatwave_data()),
    ]:
        path = os.path.join(CURRENT_DIR, f"{name}_data.csv")
        df.to_csv(path, index=False)
        target_col = f"{name}_risk"
        print(f"\n{name.upper()} data: {df.shape[0]} rows saved to {path}")
        print("Class distribution:", df[target_col].value_counts().to_dict())
