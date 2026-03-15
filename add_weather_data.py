"""
Add synthetic weather columns to nepal_power_combined.csv:
- rainfall_mm: monthly average daily rainfall correlated with monsoon/hydro patterns
- temperature_c: monthly average temperature for Nepal mid-hills
- river_flow_cumecs: river discharge correlated with monsoon rainfall
"""

import pandas as pd
import numpy as np

CSV_PATH = "nepal_power_combined.csv"

# Monthly average daily rainfall (mm) for Nepal - correlated with monsoon
# Source-like values: monsoon = heavy rain, dry winter = minimal
MONTHLY_RAINFALL = {
    1: 15,    # Jan - dry winter
    2: 20,    # Feb - dry winter
    3: 30,    # Mar - pre-monsoon (warming)
    4: 55,    # Apr - pre-monsoon (showers start)
    5: 100,   # May - pre-monsoon (building)
    6: 250,   # Jun - monsoon onset
    7: 400,   # Jul - peak monsoon
    8: 380,   # Aug - peak monsoon
    9: 280,   # Sep - monsoon retreating
    10: 80,   # Oct - post-monsoon
    11: 15,   # Nov - post-monsoon/dry
    12: 10,   # Dec - dry winter
}

# Monthly average temperature (°C) for Nepal mid-hills (~1400m)
MONTHLY_TEMP = {
    1: 10,  2: 12,  3: 16,  4: 20,  5: 22,  6: 24,
    7: 25,  8: 25,  9: 23,  10: 19, 11: 14, 12: 11,
}

# Monthly average river flow (cumecs) - correlated with rainfall + snowmelt
# Nepal's major rivers: Koshi, Gandaki, Karnali (combined representative)
MONTHLY_RIVER_FLOW = {
    1: 350,   # Jan - low base flow
    2: 300,   # Feb - lowest
    3: 320,   # Mar - slight snowmelt start
    4: 400,   # Apr - snowmelt increasing
    5: 600,   # May - snowmelt + early rain
    6: 1200,  # Jun - monsoon onset
    7: 2200,  # Jul - peak monsoon
    8: 2400,  # Aug - peak flow
    9: 1800,  # Sep - monsoon retreating
    10: 900,  # Oct - receding
    11: 500,  # Nov - post-monsoon
    12: 400,  # Dec - dry
}


def add_weather_columns():
    print("Loading CSV...")
    df = pd.read_csv(CSV_PATH, low_memory=False)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    # Parse month_number
    df["month_number"] = pd.to_numeric(df["month_number"], errors="coerce")

    np.random.seed(42)

    # Generate weather data with realistic noise
    rainfall = []
    temperature = []
    river_flow = []

    for _, row in df.iterrows():
        month = row["month_number"]
        if pd.isna(month):
            month = 1  # fallback
        month = int(month)

        # Rainfall: base + noise (proportional to magnitude)
        base_rain = MONTHLY_RAINFALL.get(month, 30)
        rain_noise = np.random.normal(0, base_rain * 0.2)  # 20% std dev
        rainfall.append(round(max(0, base_rain + rain_noise), 1))

        # Temperature: base + small noise
        base_temp = MONTHLY_TEMP.get(month, 18)
        temp_noise = np.random.normal(0, 2)
        temperature.append(round(base_temp + temp_noise, 1))

        # River flow: correlated with rainfall, with lag effect
        base_flow = MONTHLY_RIVER_FLOW.get(month, 500)
        flow_noise = np.random.normal(0, base_flow * 0.15)
        river_flow.append(round(max(50, base_flow + flow_noise), 1))

    df["rainfall_mm"] = rainfall
    df["temperature_c"] = temperature
    df["river_flow_cumecs"] = river_flow

    print(f"Added 3 weather columns. New total: {len(df.columns)} columns")
    print("\nWeather column stats:")
    print(df[["rainfall_mm", "temperature_c", "river_flow_cumecs"]].describe())

    df.to_csv(CSV_PATH, index=False)
    print(f"\nSaved to {CSV_PATH}")


if __name__ == "__main__":
    add_weather_columns()
