"""
Nepal Grid Simulator — AI REGO
Generates realistic synthetic data modeled after NEA's actual grid behavior.
Includes seasonal hydro variation, cross-border import/export logic,
demand patterns, and festival surge modeling.
"""

import random
import math
from datetime import datetime, timedelta, timezone

# Nepal Standard Time offset (UTC+5:45)
NST = timezone(timedelta(hours=5, minutes=45))

ZONES = [
    {
        "id": 1,
        "name": "Kathmandu Valley",
        "nepali_name": "काठमाडौं उपत्यका",
        "region": "Bagmati",
        "capacity_mw": 480,
        "base_load_mw": 431,
        "primary_source": "hydro+import",
        "key_substations": ["Katunje", "Balaju", "New Baneshwor"],
        "lat": 27.7172,
        "lng": 85.3240,
        "demand_profile": "urban_peak",
    },
    {
        "id": 2,
        "name": "Pokhara & Gandaki",
        "nepali_name": "पोखरा र गण्डकी",
        "region": "Gandaki",
        "capacity_mw": 210,
        "base_load_mw": 167,
        "primary_source": "hydro",
        "key_substations": ["Pokhara Substation", "Damauli"],
        "lat": 28.2096,
        "lng": 83.9856,
        "demand_profile": "urban_moderate",
    },
    {
        "id": 3,
        "name": "Eastern Terai (Biratnagar)",
        "nepali_name": "पूर्वी तराई",
        "region": "Koshi",
        "capacity_mw": 310,
        "base_load_mw": 284,
        "primary_source": "import+hydro",
        "key_substations": ["Biratnagar", "Itahari", "Dhalkebar"],
        "lat": 26.4525,
        "lng": 87.2718,
        "demand_profile": "industrial_flat",
    },
    {
        "id": 4,
        "name": "Central Terai (Birgunj–Hetauda)",
        "nepali_name": "मध्य तराई",
        "region": "Madhesh",
        "capacity_mw": 340,
        "base_load_mw": 312,
        "primary_source": "import",
        "key_substations": ["Hetauda", "Pathlaiya", "Parwanipur"],
        "lat": 27.0000,
        "lng": 85.0000,
        "demand_profile": "industrial_flat",
    },
    {
        "id": 5,
        "name": "Western Terai (Butwal–Bhairahawa)",
        "nepali_name": "पश्चिमी तराई",
        "region": "Lumbini",
        "capacity_mw": 290,
        "base_load_mw": 241,
        "primary_source": "hydro",
        "key_substations": ["Butwal", "Bhairahawa", "Tinau"],
        "lat": 27.7000,
        "lng": 83.4500,
        "demand_profile": "mixed",
    },
    {
        "id": 6,
        "name": "Far-Western (Dhangadhi–Mahendranagar)",
        "nepali_name": "सुदूरपश्चिम",
        "region": "Sudurpashchim",
        "capacity_mw": 160,
        "base_load_mw": 118,
        "primary_source": "import+solar",
        "key_substations": ["Attariya", "Mahendranagar"],
        "lat": 28.6942,
        "lng": 80.5936,
        "demand_profile": "rural",
    },
    {
        "id": 7,
        "name": "Karnali & Mid-West Hills",
        "nepali_name": "कर्णाली र मध्यपहाड",
        "region": "Karnali",
        "capacity_mw": 130,
        "base_load_mw": 89,
        "primary_source": "hydro",
        "key_substations": ["Surkhet", "Nepalgunj"],
        "lat": 28.6000,
        "lng": 81.6100,
        "demand_profile": "rural",
    },
    {
        "id": 8,
        "name": "Hilly Industrial Corridor (Hetauda–Muglin)",
        "nepali_name": "पहाडी औद्योगिक करिडोर",
        "region": "Bagmati",
        "capacity_mw": 175,
        "base_load_mw": 149,
        "primary_source": "hydro",
        "key_substations": ["Hetauda Industrial", "Muglin", "Mugling"],
        "lat": 27.6300,
        "lng": 84.8500,
        "demand_profile": "industrial_flat",
    },
]

TOTAL_INSTALLED_HYDRO_MW = 2095  # Nepal's approximate installed hydro capacity

SEASONAL_HYDRO_FACTOR = {
    1: 0.50, 2: 0.45, 3: 0.40, 4: 0.38, 5: 0.42,
    6: 0.72, 7: 0.92, 8: 0.95, 9: 0.88, 10: 0.74,
    11: 0.62, 12: 0.54,
}

KULEKHANI_CAPACITY_MWH = 60000  # Storage reservoir capacity
KULEKHANI_MAX_MW = 92  # Kulekhani I + II + III


def get_nst_now():
    return datetime.now(NST)


def hydro_output_national(month: int) -> float:
    """Total national hydro output in MW based on season."""
    factor = SEASONAL_HYDRO_FACTOR.get(month, 0.5)
    return TOTAL_INSTALLED_HYDRO_MW * factor + random.gauss(0, 20)


def _hour_demand_factor(hour: int, profile: str) -> float:
    """Returns demand multiplier (0.6–1.3) based on time of day and zone profile."""
    if profile == "urban_peak":
        # Kathmandu: strong morning + evening peaks
        if 7 <= hour <= 9:
            return 1.15 + random.uniform(0, 0.10)
        elif 18 <= hour <= 21:
            return 1.25 + random.uniform(0, 0.10)
        elif 0 <= hour <= 5:
            return 0.62 + random.uniform(0, 0.05)
        else:
            return 0.85 + random.uniform(0, 0.08)
    elif profile == "urban_moderate":
        if 7 <= hour <= 9:
            return 1.05 + random.uniform(0, 0.08)
        elif 18 <= hour <= 21:
            return 1.15 + random.uniform(0, 0.08)
        elif 0 <= hour <= 5:
            return 0.65 + random.uniform(0, 0.05)
        else:
            return 0.82 + random.uniform(0, 0.06)
    elif profile == "industrial_flat":
        # Terai industries run 24/7 — flatter profile
        if 0 <= hour <= 5:
            return 0.80 + random.uniform(0, 0.04)
        else:
            return 0.95 + random.uniform(0, 0.06)
    elif profile == "rural":
        if 6 <= hour <= 8:
            return 1.0 + random.uniform(0, 0.06)
        elif 18 <= hour <= 20:
            return 1.18 + random.uniform(0, 0.08)
        elif 0 <= hour <= 5:
            return 0.55 + random.uniform(0, 0.05)
        else:
            return 0.72 + random.uniform(0, 0.06)
    else:  # mixed
        if 7 <= hour <= 9:
            return 1.05 + random.uniform(0, 0.06)
        elif 18 <= hour <= 21:
            return 1.12 + random.uniform(0, 0.06)
        elif 0 <= hour <= 5:
            return 0.65 + random.uniform(0, 0.04)
        else:
            return 0.80 + random.uniform(0, 0.06)


def simulate_zone_load(zone: dict, hour: int, month: int, festival_mode: bool = False) -> float:
    """Simulate current load for a zone in MW."""
    base = zone["base_load_mw"]
    hour_factor = _hour_demand_factor(hour, zone["demand_profile"])
    # Dry season: heating increases demand slightly in winter
    seasonal_demand_bump = 1.0
    if month in (12, 1, 2):
        seasonal_demand_bump = 1.08
    elif month in (6, 7, 8):
        seasonal_demand_bump = 0.95  # Monsoon slightly lower demand (cooler)

    load = base * hour_factor * seasonal_demand_bump + random.gauss(0, 5)

    if festival_mode:
        # Dashain/Tihar surge: +18–25% residential
        if zone["demand_profile"] in ("urban_peak", "urban_moderate", "rural", "mixed"):
            load *= 1.22

    return round(max(0, load), 1)


def simulate_zone_hydro(zone: dict, month: int) -> float:
    """Simulate hydro generation for a specific zone based on its capacity and season."""
    factor = SEASONAL_HYDRO_FACTOR.get(month, 0.5)
    if "hydro" in zone["primary_source"]:
        hydro_share = 0.85 if zone["primary_source"] == "hydro" else 0.45
        return round(zone["capacity_mw"] * hydro_share * factor + random.gauss(0, 3), 1)
    return 0.0


def compute_cross_border(total_demand: float, total_supply: float) -> dict:
    """Compute India cross-border import/export status."""
    balance = total_supply - total_demand
    if balance > 200:
        return {
            "status": "exporting",
            "direction": "Nepal → India",
            "amount_mw": round(balance - 100, 1),
            "via": "Dhalkebar–Muzaffarpur 400kV",
            "alert": None,
        }
    elif balance < -150:
        return {
            "status": "importing",
            "direction": "India → Nepal",
            "amount_mw": round(abs(balance) + 50, 1),
            "via": "Dhalkebar–Muzaffarpur 400kV",
            "alert": "India import trigger — national deficit exceeds 150MW",
        }
    else:
        return {
            "status": "balanced",
            "direction": "Minimal exchange",
            "amount_mw": round(abs(balance), 1),
            "via": "Dhalkebar–Muzaffarpur 400kV",
            "alert": None,
        }


def get_zone_status(load_mw: float, capacity_mw: float) -> str:
    """Return zone status color code."""
    ratio = load_mw / capacity_mw if capacity_mw > 0 else 1.0
    if ratio >= 0.92:
        return "red"  # Near capacity
    elif ratio >= 0.78:
        return "yellow"  # Elevated
    elif ratio < 0.55:
        return "blue"  # Surplus
    else:
        return "green"  # Normal


def generate_grid_snapshot(month: int = None, hour: int = None, festival_mode: bool = False, season_override: str = None) -> dict:
    """Generate a complete grid state snapshot."""
    now = get_nst_now()
    if month is None:
        month = now.month
    if hour is None:
        hour = now.hour

    # Allow season override for toggle
    if season_override == "monsoon":
        month = 7
    elif season_override == "dry":
        month = 3

    zones_data = []
    total_demand = 0
    total_hydro = 0
    total_capacity = 0

    for zone in ZONES:
        load = simulate_zone_load(zone, hour, month, festival_mode)
        hydro = simulate_zone_hydro(zone, month)
        status = get_zone_status(load, zone["capacity_mw"])
        import_mw = max(0, load - hydro) if "import" in zone["primary_source"] else 0

        zone_data = {
            "id": zone["id"],
            "name": zone["name"],
            "nepali_name": zone["nepali_name"],
            "region": zone["region"],
            "capacity_mw": zone["capacity_mw"],
            "load_mw": round(load, 1),
            "hydro_generation_mw": round(hydro, 1),
            "import_mw": round(import_mw, 1),
            "primary_source": zone["primary_source"],
            "key_substations": zone["key_substations"],
            "status": status,
            "utilization_pct": round((load / zone["capacity_mw"]) * 100, 1),
            "lat": zone["lat"],
            "lng": zone["lng"],
        }
        zones_data.append(zone_data)
        total_demand += load
        total_hydro += hydro
        total_capacity += zone["capacity_mw"]

    national_hydro = hydro_output_national(month)
    cross_border = compute_cross_border(total_demand, national_hydro)

    # Kulekhani reservoir level (seasonal)
    kulekhani_pct = max(15, min(98, SEASONAL_HYDRO_FACTOR[month] * 100 + random.gauss(0, 5)))

    # Load shedding probability per zone
    for zd in zones_data:
        if zd["utilization_pct"] > 92:
            zd["load_shedding_probability"] = min(95, zd["utilization_pct"] - 20 + random.uniform(0, 15))
        elif zd["utilization_pct"] > 80:
            zd["load_shedding_probability"] = random.uniform(5, 25)
        else:
            zd["load_shedding_probability"] = random.uniform(0, 5)
        zd["load_shedding_probability"] = round(zd["load_shedding_probability"], 1)

    season = _get_season_label(month)

    return {
        "timestamp": now.isoformat(),
        "month": month,
        "hour": hour,
        "season": season,
        "festival_mode": festival_mode,
        "zones": zones_data,
        "national_summary": {
            "total_demand_mw": round(total_demand, 1),
            "total_hydro_generation_mw": round(national_hydro, 1),
            "total_capacity_mw": total_capacity,
            "national_utilization_pct": round((total_demand / total_capacity) * 100, 1),
            "surplus_deficit_mw": round(national_hydro - total_demand, 1),
        },
        "cross_border": cross_border,
        "kulekhani_reservoir": {
            "level_pct": round(kulekhani_pct, 1),
            "available_mw": round(KULEKHANI_MAX_MW * (kulekhani_pct / 100), 1),
            "max_mw": KULEKHANI_MAX_MW,
            "capacity_mwh": KULEKHANI_CAPACITY_MWH,
        },
    }


def generate_forecast(hours: int = 72, festival_mode: bool = False, season_override: str = None) -> list:
    """Generate hourly forecast for the next N hours."""
    now = get_nst_now()
    forecast = []

    for h_offset in range(hours):
        future = now + timedelta(hours=h_offset)
        month = future.month
        hour = future.hour

        if season_override == "monsoon":
            month = 7
        elif season_override == "dry":
            month = 3

        # Total demand
        total_demand = 0
        for zone in ZONES:
            total_demand += simulate_zone_load(zone, hour, month, festival_mode)

        # Total hydro supply
        hydro_supply = hydro_output_national(month)

        # Import cushion (what we'd bring in from India if needed)
        deficit = total_demand - hydro_supply
        import_cushion = max(0, deficit + 50) if deficit > 0 else 0

        forecast.append({
            "timestamp": future.isoformat(),
            "hour_offset": h_offset,
            "hour": hour,
            "month": month,
            "demand_mw": round(total_demand, 1),
            "hydro_supply_mw": round(hydro_supply, 1),
            "import_cushion_mw": round(import_cushion, 1),
            "surplus_deficit_mw": round(hydro_supply - total_demand, 1),
            "is_deficit": deficit > 0,
        })

    return forecast


def generate_alerts(grid_snapshot: dict) -> list:
    """Generate contextual NEA alerts based on current grid state."""
    alerts = []
    now_str = get_nst_now().strftime("%H:%M NST")

    # Deficit alerts
    for zone in grid_snapshot["zones"]:
        if zone["status"] == "red":
            alerts.append({
                "type": "deficit",
                "severity": "high",
                "message_en": f"⚠️ High load alert — {zone['name']} at {zone['utilization_pct']}% capacity",
                "message_np": f"⚠️ उच्च भार चेतावनी — {zone['nepali_name']} {zone['utilization_pct']}% क्षमतामा",
                "zone_id": zone["id"],
                "time": now_str,
            })
        if zone["load_shedding_probability"] > 40:
            alerts.append({
                "type": "load_shedding",
                "severity": "high",
                "message_en": f"🔴 Load shedding likely in {zone['name']} — {zone['load_shedding_probability']}% probability in next 6h",
                "message_np": f"🔴 {zone['nepali_name']}मा लोडशेडिङ हुने सम्भावना — अर्को ६ घण्टामा {zone['load_shedding_probability']}%",
                "zone_id": zone["id"],
                "time": now_str,
            })

    # Cross-border alert
    cb = grid_snapshot["cross_border"]
    if cb["alert"]:
        alerts.append({
            "type": "import",
            "severity": "high",
            "message_en": f"🔴 {cb['alert']} — {cb['amount_mw']}MW via {cb['via']}",
            "message_np": f"🔴 भारतबाट आयात आवश्यक — {cb['amount_mw']}MW {cb['via']} मार्फत",
            "zone_id": None,
            "time": now_str,
        })
    elif cb["status"] == "exporting":
        alerts.append({
            "type": "export",
            "severity": "info",
            "message_en": f"🔵 Surplus export to India — {cb['amount_mw']}MW via {cb['via']}",
            "message_np": f"🔵 भारतमा अधिशेष निर्यात — {cb['amount_mw']}MW {cb['via']} मार्फत",
            "zone_id": None,
            "time": now_str,
        })

    # Season-specific alerts
    season = grid_snapshot["season"]
    if season in ("dry_winter", "pre_monsoon"):
        national = grid_snapshot["national_summary"]
        if national["surplus_deficit_mw"] < -100:
            alerts.append({
                "type": "seasonal",
                "severity": "warning",
                "message_en": f"⚠️ Dry season deficit window — National shortfall {abs(national['surplus_deficit_mw'])}MW",
                "message_np": f"⚠️ सुख्खा मौसम घाटा — राष्ट्रिय कमी {abs(national['surplus_deficit_mw'])}MW",
                "zone_id": None,
                "time": now_str,
            })

    # Festival mode alert
    if grid_snapshot["festival_mode"]:
        alerts.append({
            "type": "festival",
            "severity": "warning",
            "message_en": "🎉 Festival demand surge detected — Dashain/Tihar mode ON, +22% residential load increase",
            "message_np": "🎉 चाडपर्व माग वृद्धि — दशैं/तिहार मोड सक्रिय, आवासीय भार +२२% बढ्यो",
            "zone_id": None,
            "time": now_str,
        })

    # Kulekhani reservoir
    kulekhani = grid_snapshot["kulekhani_reservoir"]
    if kulekhani["level_pct"] < 35:
        alerts.append({
            "type": "reservoir",
            "severity": "warning",
            "message_en": f"⚠️ Kulekhani reservoir low — {kulekhani['level_pct']}% capacity, {kulekhani['available_mw']}MW available",
            "message_np": f"⚠️ कुलेखानी जलाशय कम — {kulekhani['level_pct']}% क्षमता, {kulekhani['available_mw']}MW उपलब्ध",
            "zone_id": None,
            "time": now_str,
        })

    return alerts


def _get_season_label(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "monsoon"
    elif month in (3, 4, 5):
        return "pre_monsoon"
    elif month in (10, 11):
        return "post_monsoon"
    else:
        return "dry_winter"
