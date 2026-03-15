"""
ML Service — Trains on nepal_power_combined.csv and predicts future seasonal patterns.
Uses RandomForest to predict demand, hydro supply, import cushion, and surplus/deficit
based on temporal and seasonal features.

Also trains per-zone models (8 zones × 2 targets = 16 models) for zone-level predictions.

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
    # Zone-level caches
    "zone_models": None,
    "zone_predictions": None,
    "zone_ready": False,
    # Cost analysis cache
    "cost_analysis": None,
}

TARGETS = ["total_demand_mw", "total_supply_mw", "import_cushion_mw", "surplus_deficit_mw"]
ZONE_TARGETS = ["load_mw", "utilization_pct"]

# Zone metadata for feature encoding
ZONE_META = {
    1: {"capacity_mw": 480, "primary_source": "hydro+import"},
    2: {"capacity_mw": 210, "primary_source": "hydro"},
    3: {"capacity_mw": 310, "primary_source": "import+hydro"},
    4: {"capacity_mw": 340, "primary_source": "import"},
    5: {"capacity_mw": 290, "primary_source": "hydro"},
    6: {"capacity_mw": 160, "primary_source": "import+solar"},
    7: {"capacity_mw": 130, "primary_source": "hydro"},
    8: {"capacity_mw": 175, "primary_source": "hydro"},
}

SOURCE_TYPE_MAP = {
    "hydro": 0, "hydro+import": 1, "import+hydro": 2,
    "import": 3, "import+solar": 4,
}

# Monthly weather baselines for synthetic feature generation during prediction
MONTHLY_RAINFALL = {
    1: 15, 2: 20, 3: 30, 4: 55, 5: 100, 6: 250,
    7: 400, 8: 380, 9: 280, 10: 80, 11: 15, 12: 10,
}
MONTHLY_TEMPERATURE = {
    1: 10, 2: 12, 3: 16, 4: 20, 5: 22, 6: 24,
    7: 25, 8: 25, 9: 23, 10: 19, 11: 14, 12: 11,
}
MONTHLY_RIVER_FLOW = {
    1: 350, 2: 300, 3: 320, 4: 400, 5: 600, 6: 1200,
    7: 2200, 8: 2400, 9: 1800, 10: 900, 11: 500, 12: 400,
}


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
        "rainfall_mm", "temperature_c", "river_flow_cumecs",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["total_demand_mw", "total_supply_mw"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def _load_zone_data() -> pd.DataFrame:
    """Load Zone Load Generation rows from CSV with per-zone data."""
    df = pd.read_csv(CSV_PATH, low_memory=False)
    df = df[df["source"] == "Zone Load Generation"].copy()
    df["date"] = pd.to_datetime(df["date"])

    zone_numeric_cols = [
        "zone_id", "capacity_mw", "load_mw", "hydro_generation_mw",
        "import_mw", "solar_mw", "utilization_pct", "load_shedding_probability_pct",
    ]
    for col in zone_numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["hour"] = pd.to_numeric(df["hour"], errors="coerce")
    df = df.dropna(subset=["zone_id", "load_mw", "utilization_pct"])
    df["zone_id"] = df["zone_id"].astype(int)
    # Create synthetic timestamp from date + hour
    df["timestamp"] = df["date"] + pd.to_timedelta(df["hour"], unit="h")
    df = df.sort_values(["zone_id", "timestamp"]).reset_index(drop=True)
    return df


def _build_zone_features(df: pd.DataFrame, zone_id: int) -> pd.DataFrame:
    """Create zone-specific features for ML (temporal + zone metadata)."""
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

    # Zone-specific features
    meta = ZONE_META[zone_id]
    features["capacity_mw"] = meta["capacity_mw"]
    features["source_type"] = SOURCE_TYPE_MAP.get(meta["primary_source"], 0)

    return features


def _build_features(df: pd.DataFrame, rainfall_factor: float = 1.0) -> pd.DataFrame:
    """Create temporal, seasonal, and weather features for ML."""
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

    # Weather features
    if "rainfall_mm" in df.columns:
        features["rainfall_mm"] = df["rainfall_mm"].values * rainfall_factor
        features["temperature_c"] = df["temperature_c"].values
        features["river_flow_cumecs"] = df["river_flow_cumecs"].values * rainfall_factor
    else:
        # Generate from monthly baselines (for prediction)
        months = features["month"].values
        features["rainfall_mm"] = np.array([MONTHLY_RAINFALL.get(m, 30) for m in months]) * rainfall_factor
        features["temperature_c"] = np.array([MONTHLY_TEMPERATURE.get(m, 18) for m in months])
        features["river_flow_cumecs"] = np.array([MONTHLY_RIVER_FLOW.get(m, 500) for m in months]) * rainfall_factor

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
        rainfall_mm=("rainfall_mm", "mean"),
        temperature_c=("temperature_c", "mean"),
        river_flow_cumecs=("river_flow_cumecs", "mean"),
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
            "rainfall_mm": round(row["rainfall_mm"], 1),
            "temperature_c": round(row["temperature_c"], 1),
            "river_flow_cumecs": round(row["river_flow_cumecs"], 1),
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
            "rainfall_mm": round(MONTHLY_RAINFALL.get(month, 30), 1),
            "temperature_c": round(MONTHLY_TEMPERATURE.get(month, 18), 1),
            "river_flow_cumecs": round(MONTHLY_RIVER_FLOW.get(month, 500), 1),
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
    _cache["models"] = models
    _cache["historical"] = historical
    _cache["predictions"] = predictions
    _cache["model_info"] = model_info
    _cache["ready"] = True
    print(f"[ML] Ready! {len(historical)} historical days + {len(predictions)} predicted days cached.")

    # --- Zone-level model training ---
    print("[ML] Loading zone-level CSV data...")
    zone_df = _load_zone_data()
    print(f"[ML] Found {len(zone_df)} zone data rows across {zone_df['zone_id'].nunique()} zones")

    zone_models = {}
    zone_predictions = {}
    zone_ids = sorted(zone_df["zone_id"].unique())

    for zid in zone_ids:
        z_df = zone_df[zone_df["zone_id"] == zid].copy()
        if len(z_df) < 50:
            print(f"[ML] Zone {zid}: skipping, only {len(z_df)} rows")
            continue

        X_zone = _build_zone_features(z_df, zid)
        zone_models[zid] = {}

        for target in ZONE_TARGETS:
            y = z_df[target].values
            rf = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
            rf.fit(X_zone.values, y)
            zone_models[zid][target] = rf

        # --- Generate future zone predictions ---
        last_zone_date = z_df["timestamp"].max()
        zone_end = datetime(2026, 12, 31)
        zone_days = (zone_end - last_zone_date.to_pydatetime().replace(tzinfo=None)).days
        if zone_days <= 0:
            zone_days = 365

        future_ts = [
            (last_zone_date + timedelta(days=d)).replace(hour=h, minute=0, second=0, microsecond=0)
            for d in range(1, zone_days + 1)
            for h in range(24)
        ]
        future_zone_df = pd.DataFrame({"timestamp": future_ts})
        future_zone_df["season"] = future_zone_df["timestamp"].dt.month.map(lambda m: _get_season(m))
        X_future = _build_zone_features(future_zone_df, zid)

        preds = {}
        for target in ZONE_TARGETS:
            preds[target] = zone_models[zid][target].predict(X_future.values)

        # Aggregate hourly to daily
        zone_preds_daily = []
        capacity = ZONE_META[zid]["capacity_mw"]
        for day_idx in range(zone_days):
            start = day_idx * 24
            end = start + 24
            future_date = last_zone_date + timedelta(days=day_idx + 1)
            month = future_date.month

            avg_load = float(np.mean(preds["load_mw"][start:end]))
            avg_util = float(np.mean(preds["utilization_pct"][start:end]))
            peak_util = float(np.max(preds["utilization_pct"][start:end]))

            # Derive load shedding probability from utilization
            if avg_util >= 92:
                ls_prob = min(95, avg_util - 20 + 10)
            elif avg_util >= 80:
                ls_prob = (avg_util - 80) * 2.0
            elif avg_util >= 70:
                ls_prob = (avg_util - 70) * 0.5
            else:
                ls_prob = max(0, avg_util * 0.05)

            zone_preds_daily.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "zone_id": zid,
                "load_mw": round(avg_load, 1),
                "utilization_pct": round(avg_util, 1),
                "peak_utilization_pct": round(peak_util, 1),
                "capacity_mw": capacity,
                "load_shedding_probability_pct": round(ls_prob, 1),
                "season": _get_season(month),
                "type": "prediction",
            })

        zone_predictions[zid] = zone_preds_daily
        print(f"[ML] Zone {zid}: trained on {len(z_df)} rows, {len(zone_preds_daily)} daily predictions generated")

    _cache["zone_models"] = zone_models
    _cache["zone_predictions"] = zone_predictions
    _cache["zone_ready"] = True
    print(f"[ML] Zone models ready! {len(zone_models)} zones trained.")


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


def predict_what_if(rainfall_factor: float = 1.0, days: int = None) -> list:
    """Re-predict with adjusted rainfall factor for What-If scenarios.
    rainfall_factor: 1.0 = normal, 0.7 = 30% below normal, 1.3 = 30% above normal.

    Uses a physics-informed hybrid approach:
    - Nepal is ~85-93% run-of-river hydro, so rainfall directly drives hydro output
    - HYDRO_SENSITIVITY controls how strongly rainfall changes affect hydro (0.75 = 75% pass-through)
    - Demand is slightly affected too (drought → more pumping/cooling load)
    """
    if not _cache["ready"]:
        startup()

    # If normal rainfall, return cached predictions
    if abs(rainfall_factor - 1.0) < 0.01:
        preds = _cache["predictions"]
        return preds[:days] if days else preds

    # Physics-based scaling: how much rainfall change translates to hydro change
    # 0.75 means 30% less rain → ~22.5% less hydro (buffered by reservoirs like Kulekhani)
    HYDRO_SENSITIVITY = 0.75
    # Hydro adjustment: scales the hydro component of supply
    hydro_adj = 1.0 + (rainfall_factor - 1.0) * HYDRO_SENSITIVITY
    # Demand slightly increases during drought (pumping, cooling)
    demand_adj = 1.0 + (1.0 - rainfall_factor) * 0.03  # 3% demand increase per 100% rainfall drop

    # Start from cached normal predictions and apply physics-based adjustments
    base_preds = _cache["predictions"]
    if days:
        base_preds = base_preds[:days]

    predictions = []
    for p in base_preds:
        month = int(p["date"].split("-")[1])

        # Adjust hydro output (85% of supply is hydro)
        normal_hydro = p["supply_mw"] * 0.85
        normal_other = p["supply_mw"] * 0.15  # solar + imports stay same
        adjusted_hydro = normal_hydro * hydro_adj
        adjusted_supply = adjusted_hydro + normal_other

        # Adjust demand slightly
        adjusted_demand = p["demand_mw"] * demand_adj

        # Recompute surplus/deficit
        adjusted_surplus = adjusted_supply - adjusted_demand

        # Kulekhani reservoir drops faster in drought
        base_kulekhani = KULEKHANI_LEVELS.get(month, 50)
        adjusted_kulekhani = base_kulekhani * min(1.0, hydro_adj)

        predictions.append({
            "date": p["date"],
            "demand_mw": round(adjusted_demand, 1),
            "supply_mw": round(adjusted_supply, 1),
            "hydro_mw": round(adjusted_hydro, 1),
            "solar_mw": round(p["solar_mw"], 1),
            "import_cushion_mw": round(p["import_cushion_mw"] * hydro_adj, 1),
            "surplus_deficit_mw": round(adjusted_surplus, 1),
            "utilization_pct": round(adjusted_demand / max(adjusted_supply, 1) * 100, 1),
            "kulekhani_pct": round(adjusted_kulekhani + float(np.random.normal(0, 2)), 1),
            "rainfall_mm": round(MONTHLY_RAINFALL.get(month, 30) * rainfall_factor, 1),
            "temperature_c": round(MONTHLY_TEMPERATURE.get(month, 18), 1),
            "river_flow_cumecs": round(MONTHLY_RIVER_FLOW.get(month, 500) * rainfall_factor, 1),
            "season": p["season"],
            "type": "what_if",
            "rainfall_factor": rainfall_factor,
        })

    return predictions


def get_model_info() -> dict:
    """Return cached model info."""
    if not _cache["ready"]:
        startup()
    return _cache["model_info"]


def get_zone_predictions(zone_id: int = None, days: int = None) -> dict:
    """Return cached zone-level predictions.
    If zone_id is None, return all zones.
    If days is specified, slice to that many days per zone.
    """
    if not _cache["zone_ready"]:
        startup()
    zone_preds = _cache["zone_predictions"]
    if zone_id is not None:
        preds = zone_preds.get(zone_id, [])
        if days:
            preds = preds[:days]
        return {zone_id: preds}
    if days:
        return {zid: p[:days] for zid, p in zone_preds.items()}
    return zone_preds


def get_all_zone_summary() -> list:
    """Return a summary of predicted utilization per zone for map coloring.
    Returns avg predicted utilization and load shedding risk for the next 30 days.
    """
    if not _cache["zone_ready"]:
        startup()
    zone_preds = _cache["zone_predictions"]
    summaries = []
    for zid, preds in zone_preds.items():
        next_30 = preds[:30] if len(preds) >= 30 else preds
        next_365 = preds[:365] if len(preds) >= 365 else preds
        next_730 = preds[:730] if len(preds) >= 730 else preds

        avg_util_30 = np.mean([p["utilization_pct"] for p in next_30]) if next_30 else 0
        avg_ls_30 = np.mean([p["load_shedding_probability_pct"] for p in next_30]) if next_30 else 0
        max_util_30 = max((p["utilization_pct"] for p in next_30), default=0)

        # Predicted status based on 30-day average
        if avg_util_30 >= 92:
            predicted_status = "red"
        elif avg_util_30 >= 78:
            predicted_status = "yellow"
        elif avg_util_30 < 55:
            predicted_status = "blue"
        else:
            predicted_status = "green"

        # Monthly risk curve for 2 years (24 months)
        monthly_risk = []
        if next_730:
            month_buckets = {}
            for p in next_730:
                month_key = p["date"][:7]  # YYYY-MM
                if month_key not in month_buckets:
                    month_buckets[month_key] = {"util": [], "ls": [], "load": []}
                month_buckets[month_key]["util"].append(p["utilization_pct"])
                month_buckets[month_key]["ls"].append(p["load_shedding_probability_pct"])
                month_buckets[month_key]["load"].append(p["load_mw"])

            for month_key in sorted(month_buckets.keys()):
                bucket = month_buckets[month_key]
                monthly_risk.append({
                    "month": month_key,
                    "avg_utilization_pct": round(np.mean(bucket["util"]), 1),
                    "avg_load_shedding_pct": round(np.mean(bucket["ls"]), 1),
                    "avg_load_mw": round(np.mean(bucket["load"]), 1),
                    "peak_utilization_pct": round(max(bucket["util"]), 1),
                })

        summaries.append({
            "zone_id": zid,
            "capacity_mw": ZONE_META[zid]["capacity_mw"],
            "primary_source": ZONE_META[zid]["primary_source"],
            "predicted_status": predicted_status,
            "avg_utilization_30d": round(avg_util_30, 1),
            "max_utilization_30d": round(max_util_30, 1),
            "avg_load_shedding_30d": round(avg_ls_30, 1),
            "monthly_risk_curve": monthly_risk,
        })

    return summaries


def _load_cross_border_data() -> pd.DataFrame:
    """Load Cross Border Exchange rows from CSV with cost/revenue data."""
    df = pd.read_csv(CSV_PATH, low_memory=False)
    df = df[df["source"] == "Cross Border Exchange"].copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = pd.to_datetime(df["date"])

    numeric_cols = [
        "import_cost_nrs_per_mwh", "export_revenue_nrs_per_mwh",
        "cumulative_import_gwh_fy", "cumulative_export_gwh_fy",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["import_cost_nrs_per_mwh", "export_revenue_nrs_per_mwh"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def _compute_cost_analysis(predictions: list = None) -> dict:
    """Compute cost impact analysis: seasonal prices from historical data,
    then project costs/revenues using ML-predicted surplus_deficit_mw.
    If predictions is None, uses cached normal predictions."""
    # 1. Extract average seasonal prices from Cross Border Exchange data
    cb_df = _load_cross_border_data()
    seasonal_prices = {}
    for season in ["monsoon", "pre_monsoon", "post_monsoon", "dry_winter"]:
        s_df = cb_df[cb_df["season"] == season]
        seasonal_prices[season] = {
            "avg_import_cost_nrs_per_mwh": round(float(s_df["import_cost_nrs_per_mwh"].mean()), 1),
            "avg_export_revenue_nrs_per_mwh": round(float(s_df["export_revenue_nrs_per_mwh"].mean()), 1),
        }

    # 2. Use predictions (surplus_deficit_mw) to compute daily costs
    #    surplus_deficit_mw < 0 → Nepal is in deficit, must import from India
    #    surplus_deficit_mw > 0 → Nepal has surplus, can export to India
    if predictions is None:
        predictions = _cache["predictions"]
    if not predictions:
        return {"seasonal_prices": seasonal_prices, "monthly": [], "seasonal": {}, "annual": {}}

    daily_costs = []
    for pred in predictions:
        season = pred["season"]
        prices = seasonal_prices.get(season, {"avg_import_cost_nrs_per_mwh": 0, "avg_export_revenue_nrs_per_mwh": 0})
        surplus_deficit = pred["surplus_deficit_mw"]

        hours_per_day = 24
        if surplus_deficit < 0:
            # Deficit → importing from India
            import_mw = abs(surplus_deficit)
            daily_import_cost = import_mw * hours_per_day * prices["avg_import_cost_nrs_per_mwh"]
            daily_export_revenue = 0.0
        else:
            # Surplus → exporting to India
            daily_import_cost = 0.0
            daily_export_revenue = surplus_deficit * hours_per_day * prices["avg_export_revenue_nrs_per_mwh"]

        daily_costs.append({
            "date": pred["date"],
            "season": season,
            "surplus_deficit_mw": round(surplus_deficit, 1),
            "import_cost_nrs": round(daily_import_cost, 0),
            "export_revenue_nrs": round(daily_export_revenue, 0),
            "net_cost_nrs": round(daily_import_cost - daily_export_revenue, 0),
        })

    # 3. Aggregate into monthly breakdown
    monthly = {}
    for dc in daily_costs:
        month_key = dc["date"][:7]  # YYYY-MM
        if month_key not in monthly:
            monthly[month_key] = {
                "month": month_key,
                "season": dc["season"],
                "total_import_cost_nrs": 0.0,
                "total_export_revenue_nrs": 0.0,
                "days": 0,
                "avg_surplus_deficit_mw": 0.0,
            }
        monthly[month_key]["total_import_cost_nrs"] += dc["import_cost_nrs"]
        monthly[month_key]["total_export_revenue_nrs"] += dc["export_revenue_nrs"]
        monthly[month_key]["days"] += 1
        monthly[month_key]["avg_surplus_deficit_mw"] += dc["surplus_deficit_mw"]

    monthly_list = []
    for mk in sorted(monthly.keys()):
        m = monthly[mk]
        m["avg_surplus_deficit_mw"] = round(m["avg_surplus_deficit_mw"] / max(m["days"], 1), 1)
        m["net_cost_nrs"] = round(m["total_import_cost_nrs"] - m["total_export_revenue_nrs"], 0)
        m["total_import_cost_nrs"] = round(m["total_import_cost_nrs"], 0)
        m["total_export_revenue_nrs"] = round(m["total_export_revenue_nrs"], 0)
        monthly_list.append(m)

    # 4. Aggregate into seasonal breakdown
    seasonal = {}
    for dc in daily_costs:
        s = dc["season"]
        if s not in seasonal:
            seasonal[s] = {
                "season": s,
                "total_import_cost_nrs": 0.0,
                "total_export_revenue_nrs": 0.0,
                "days": 0,
            }
        seasonal[s]["total_import_cost_nrs"] += dc["import_cost_nrs"]
        seasonal[s]["total_export_revenue_nrs"] += dc["export_revenue_nrs"]
        seasonal[s]["days"] += 1

    for s in seasonal:
        seasonal[s]["net_cost_nrs"] = round(
            seasonal[s]["total_import_cost_nrs"] - seasonal[s]["total_export_revenue_nrs"], 0
        )
        seasonal[s]["total_import_cost_nrs"] = round(seasonal[s]["total_import_cost_nrs"], 0)
        seasonal[s]["total_export_revenue_nrs"] = round(seasonal[s]["total_export_revenue_nrs"], 0)
        seasonal[s]["avg_daily_import_cost_nrs"] = round(
            seasonal[s]["total_import_cost_nrs"] / max(seasonal[s]["days"], 1), 0
        )
        seasonal[s]["avg_daily_export_revenue_nrs"] = round(
            seasonal[s]["total_export_revenue_nrs"] / max(seasonal[s]["days"], 1), 0
        )

    # 5. Annual totals
    total_import = sum(dc["import_cost_nrs"] for dc in daily_costs)
    total_export = sum(dc["export_revenue_nrs"] for dc in daily_costs)
    annual = {
        "total_import_cost_nrs": round(total_import, 0),
        "total_export_revenue_nrs": round(total_export, 0),
        "net_cost_nrs": round(total_import - total_export, 0),
        "prediction_days": len(daily_costs),
    }

    return {
        "seasonal_prices": seasonal_prices,
        "monthly": monthly_list,
        "seasonal": seasonal,
        "annual": annual,
    }


def get_cost_analysis(rainfall_factor: float = 1.0) -> dict:
    """Return cost analysis data. For normal rainfall uses cache, otherwise computes on the fly."""
    if not _cache["ready"]:
        startup()
    if abs(rainfall_factor - 1.0) < 0.01:
        # Normal: use cache
        if _cache["cost_analysis"] is None:
            _cache["cost_analysis"] = _compute_cost_analysis()
        return _cache["cost_analysis"]
    else:
        # What-If: compute with adjusted predictions
        what_if_preds = predict_what_if(rainfall_factor=rainfall_factor)
        result = _compute_cost_analysis(predictions=what_if_preds)
        result["rainfall_factor"] = rainfall_factor
        return result
