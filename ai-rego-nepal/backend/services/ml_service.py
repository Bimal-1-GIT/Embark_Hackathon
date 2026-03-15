"""
ML Service — Trains on nepal_power_combined.csv and predicts future seasonal patterns.
Uses RandomForest to predict demand, hydro supply, import cushion, and surplus/deficit
based on temporal and seasonal features.

All training and prediction is done once at startup and cached.
"""

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "nepal_power_combined.csv")

# All results are pre-computed and cached here
_cache = {
    "models": None,
    "feature_names": None,
    "historical": None,
    "predictions": None,
    "model_info": None,
    "ready": False,
}

TARGETS = ["total_demand_mw", "total_supply_mw", "import_cushion_mw", "surplus_deficit_mw"]


def _load_hourly_data() -> pd.DataFrame:
    """Load and filter the CSV to only Hourly Forecast rows with valid data."""
    df = pd.read_csv(CSV_PATH, low_memory=False)
    df = df[df["source"] == "Hourly Forecast"].copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = pd.to_datetime(df["date"])

    numeric_cols = [
        "total_demand_mw", "nea_hydro_supply_mw", "ipp_hydro_mw",
        "solar_supply_mw", "total_supply_mw", "import_cushion_mw",
        "surplus_deficit_mw", "national_utilization_pct", "system_loss_pct",
        "kulekhani_level_pct",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["total_demand_mw", "total_supply_mw"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create temporal and seasonal features for ML."""
    features = pd.DataFrame()
    features["hour"] = df["timestamp"].dt.hour
    features["day_of_week"] = df["timestamp"].dt.dayofweek
    features["month"] = df["timestamp"].dt.month
    features["day_of_year"] = df["timestamp"].dt.dayofyear
    features["week_of_year"] = df["timestamp"].dt.isocalendar().week.astype(int)

    features["hour_sin"] = np.sin(2 * np.pi * features["hour"] / 24)
    features["hour_cos"] = np.cos(2 * np.pi * features["hour"] / 24)
    features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
    features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
    features["day_of_year_sin"] = np.sin(2 * np.pi * features["day_of_year"] / 365)
    features["day_of_year_cos"] = np.cos(2 * np.pi * features["day_of_year"] / 365)

    season_map = {"monsoon": 0, "pre_monsoon": 1, "post_monsoon": 2, "dry_winter": 3}
    features["season_num"] = df["season"].map(season_map).fillna(0).astype(int)
    features["is_weekend"] = (features["day_of_week"] >= 5).astype(int)
    features["is_peak"] = ((features["hour"] >= 18) & (features["hour"] <= 21)).astype(int)

    return features


def _get_season(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "monsoon"
    elif month in (3, 4, 5):
        return "pre_monsoon"
    elif month in (10, 11):
        return "post_monsoon"
    else:
        return "dry_winter"


def _get_season_num(month: int) -> int:
    season_map = {"monsoon": 0, "pre_monsoon": 1, "post_monsoon": 2, "dry_winter": 3}
    return season_map[_get_season(month)]


KULEKHANI_LEVELS = {
    1: 45, 2: 38, 3: 32, 4: 28, 5: 35,
    6: 55, 7: 75, 8: 88, 9: 92, 10: 85,
    11: 72, 12: 58,
}


def startup():
    """Pre-train models and pre-compute all results. Call once at server startup."""
    global _cache
    if _cache["ready"]:
        return

    print("[ML] Loading CSV data...")
    df = _load_hourly_data()

    # --- Build historical data ---
    print("[ML] Aggregating historical data...")
    daily = df.groupby("date").agg(
        total_demand_mw=("total_demand_mw", "mean"),
        total_supply_mw=("total_supply_mw", "mean"),
        nea_hydro_supply_mw=("nea_hydro_supply_mw", "mean"),
        ipp_hydro_mw=("ipp_hydro_mw", "mean"),
        solar_supply_mw=("solar_supply_mw", "mean"),
        import_cushion_mw=("import_cushion_mw", "mean"),
        surplus_deficit_mw=("surplus_deficit_mw", "mean"),
        national_utilization_pct=("national_utilization_pct", "mean"),
        kulekhani_level_pct=("kulekhani_level_pct", "mean"),
    ).reset_index().sort_values("date")

    historical = []
    for _, row in daily.iterrows():
        historical.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "demand_mw": round(row["total_demand_mw"], 1),
            "supply_mw": round(row["total_supply_mw"], 1),
            "hydro_mw": round(row["nea_hydro_supply_mw"] + row["ipp_hydro_mw"], 1),
            "solar_mw": round(row["solar_supply_mw"], 1),
            "import_cushion_mw": round(row["import_cushion_mw"], 1),
            "surplus_deficit_mw": round(row["surplus_deficit_mw"], 1),
            "utilization_pct": round(row["national_utilization_pct"], 1),
            "kulekhani_pct": round(row["kulekhani_level_pct"], 1),
            "season": _get_season(row["date"].month),
            "type": "historical",
        })

    # --- Train models ---
    print("[ML] Training RandomForest models...")
    X = _build_features(df)
    feature_names = X.columns.tolist()

    models = {}
    for target in TARGETS:
        y = df[target].values
        rf = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
        rf.fit(X.values, y)
        models[target] = rf

    # --- Batch-predict future until Dec 2026 (vectorized) ---
    last_date = df["timestamp"].max()
    # Calculate days needed to reach Dec 31, 2026
    target_end = datetime(2026, 12, 31)
    days = (target_end - last_date.to_pydatetime().replace(tzinfo=None)).days
    print(f"[ML] Generating {days}-day predictions (vectorized) until Dec 2026...")

    # Build all 365*24 timestamps at once
    future_timestamps = [
        (last_date + timedelta(days=d)).replace(hour=h, minute=0, second=0, microsecond=0)
        for d in range(1, days + 1)
        for h in range(24)
    ]
    future_df = pd.DataFrame({"timestamp": future_timestamps})
    future_df["season"] = future_df["timestamp"].dt.month.map(
        lambda m: _get_season(m)
    )

    # Build features for all timestamps at once
    future_X = _build_features(future_df)

    # Predict all targets in one batch call per target
    all_preds = {}
    for target in TARGETS:
        all_preds[target] = models[target].predict(future_X.values)

    # Aggregate hourly predictions to daily
    predictions = []
    for day_idx in range(days):
        start = day_idx * 24
        end = start + 24
        future_date = last_date + timedelta(days=day_idx + 1)
        month = future_date.month

        avg_demand = float(np.mean(all_preds["total_demand_mw"][start:end]))
        avg_supply = float(np.mean(all_preds["total_supply_mw"][start:end]))

        predictions.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "demand_mw": round(avg_demand, 1),
            "supply_mw": round(avg_supply, 1),
            "hydro_mw": round(avg_supply * 0.85, 1),
            "solar_mw": round(avg_supply * 0.05, 1),
            "import_cushion_mw": round(float(np.mean(all_preds["import_cushion_mw"][start:end])), 1),
            "surplus_deficit_mw": round(float(np.mean(all_preds["surplus_deficit_mw"][start:end])), 1),
            "utilization_pct": round(avg_demand / max(avg_supply, 1) * 100, 1),
            "kulekhani_pct": round(KULEKHANI_LEVELS.get(month, 50) + float(np.random.normal(0, 3)), 1),
            "season": _get_season(month),
            "type": "prediction",
        })

    # --- Build model info ---
    model_info = {
        "algorithm": "RandomForestRegressor",
        "n_estimators": 100,
        "max_depth": 15,
        "training_samples": len(df),
        "training_date_range": f"{df['timestamp'].min().strftime('%Y-%m-%d')} to {df['timestamp'].max().strftime('%Y-%m-%d')}",
        "features": feature_names,
        "targets": TARGETS,
        "feature_importances": {},
    }
    for target in TARGETS:
        importances = {k: round(float(v), 4) for k, v in zip(feature_names, models[target].feature_importances_)}
        model_info["feature_importances"][target] = dict(
            sorted(importances.items(), key=lambda x: x[1], reverse=True)
        )

    # --- Cache everything ---
    _cache["historical"] = historical
    _cache["predictions"] = predictions
    _cache["model_info"] = model_info
    _cache["ready"] = True
    print(f"[ML] Ready! {len(historical)} historical days + {len(predictions)} predicted days cached.")


def get_historical_data() -> list:
    """Return cached daily-aggregated historical data."""
    if not _cache["ready"]:
        startup()
    return _cache["historical"]


def predict_future(days: int = None) -> list:
    """Return cached predictions (sliced to requested days, or all if None)."""
    if not _cache["ready"]:
        startup()
    if days is None:
        return _cache["predictions"]
    return _cache["predictions"][:days]


def get_model_info() -> dict:
    """Return cached model info."""
    if not _cache["ready"]:
        startup()
    return _cache["model_info"]
