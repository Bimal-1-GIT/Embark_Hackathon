"""
LLM Service — AI REGO Nepal
Integrates with Azure OpenAI GPT API for:
1. AI Recommendation Engine (grid optimization suggestions)
2. What-If Chat Interface (bilingual EN/NP)
"""

import json
import os
import httpx

API_KEY = os.environ.get("AZURE_OPENAI_API_KEY", "")
ENDPOINT = os.environ.get(
    "AZURE_OPENAI_ENDPOINT",
    "https://ai-airegonepal3581186650.openai.azure.com",
)
API_VERSION = "2024-12-01-preview"
DEPLOYMENT = "gpt-4o"

RECOMMENDATION_SYSTEM = """You are an AI grid optimization assistant for Nepal Electricity Authority (NEA). Nepal's grid is ~93% hydropower with strong seasonal variation. Given the current grid state, generate exactly 3 JSON recommendation objects relevant to Nepal's grid context (hydropower dispatch, cross-border import/export, demand-side management). Each must have: title, description, zones_affected (array of zone names), mw_relief (number), co2_saved_tonnes (number), estimated_npr_savings (number), priority ("high"/"medium"/"low"). Return only valid JSON array, no markdown."""

WHATIF_SYSTEM = """You are AI REGO, the AI grid operations assistant for Nepal Electricity Authority (NEA). You understand Nepal's hydro-dominant grid, seasonal monsoon patterns, cross-border India interconnections, and local demand patterns including festival surges (Dashain, Tihar). When answering what-if scenarios, reference specific Nepal grid assets (Kulekhani, Upper Tamakoshi, Marsyangdi, Dhalkebar cross-border link). Respond in the same language the user writes in — English or Nepali. Keep response under 200 words."""


async def _call_azure_openai(system_prompt: str, user_prompt: str) -> str:
    """Make a call to Azure OpenAI GPT API."""
    if not API_KEY:
        raise RuntimeError("AZURE_OPENAI_API_KEY is not set")

    url = f"{ENDPOINT}/openai/deployments/{DEPLOYMENT}/chat/completions?api-version={API_VERSION}"
    headers = {
        "Content-Type": "application/json",
        "api-key": API_KEY,
    }
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1000,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def get_recommendations(grid_state: dict) -> list:
    """Generate 3 AI recommendations based on current Nepal grid state."""
    grid_summary = json.dumps({
        "national_summary": grid_state.get("national_summary", {}),
        "cross_border": grid_state.get("cross_border", {}),
        "season": grid_state.get("season", ""),
        "festival_mode": grid_state.get("festival_mode", False),
        "kulekhani_reservoir": grid_state.get("kulekhani_reservoir", {}),
        "zones": [
            {
                "name": z["name"],
                "load_mw": z["load_mw"],
                "capacity_mw": z["capacity_mw"],
                "status": z["status"],
                "hydro_generation_mw": z["hydro_generation_mw"],
            }
            for z in grid_state.get("zones", [])
        ],
    }, indent=2)

    user_prompt = f"Current Nepal grid state:\n{grid_summary}"

    try:
        raw = await _call_azure_openai(RECOMMENDATION_SYSTEM, user_prompt)
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        recommendations = json.loads(cleaned)
        return recommendations
    except Exception as e:
        # Fallback static recommendations if API fails
        return _fallback_recommendations(grid_state)


async def chat_what_if(grid_state: dict, user_question: str) -> str:
    """Handle What-If scenario chat question."""
    grid_summary = json.dumps({
        "national_summary": grid_state.get("national_summary", {}),
        "cross_border": grid_state.get("cross_border", {}),
        "season": grid_state.get("season", ""),
        "kulekhani_reservoir": grid_state.get("kulekhani_reservoir", {}),
        "zones": [
            {"name": z["name"], "load_mw": z["load_mw"], "status": z["status"]}
            for z in grid_state.get("zones", [])
        ],
    }, indent=2)

    user_prompt = f"Nepal grid state:\n{grid_summary}\n\nScenario: {user_question}"

    try:
        response = await _call_azure_openai(WHATIF_SYSTEM, user_prompt)
        return response
    except Exception as e:
        return f"Sorry, I couldn't process that question right now. Error: {str(e)}. Please try again."


def _fallback_recommendations(grid_state: dict) -> list:
    """Provide fallback recommendations when API is unavailable."""
    season = grid_state.get("season", "dry_winter")
    cross_border = grid_state.get("cross_border", {})

    recs = []

    if season in ("dry_winter", "pre_monsoon"):
        recs.append({
            "title": "Activate Upper Tamakoshi additional units",
            "description": "Upper Tamakoshi (456MW) has spare capacity. Activating additional units can reduce India import dependency during dry season.",
            "zones_affected": ["Kathmandu Valley", "Central Terai (Birgunj–Hetauda)"],
            "mw_relief": 60,
            "co2_saved_tonnes": 42,
            "estimated_npr_savings": 2400000,
            "priority": "high",
        })
    else:
        recs.append({
            "title": "Maximize export via Dhalkebar–Muzaffarpur link",
            "description": "Monsoon surplus exceeds domestic demand. Export additional capacity to India via PTC agreement for revenue generation.",
            "zones_affected": ["Eastern Terai (Biratnagar)", "Central Terai (Birgunj–Hetauda)"],
            "mw_relief": 120,
            "co2_saved_tonnes": 85,
            "estimated_npr_savings": 5600000,
            "priority": "medium",
        })

    if cross_border.get("status") == "importing":
        recs.append({
            "title": "Pre-schedule India import for evening peak",
            "description": "National deficit detected. Pre-schedule 80MW import via Dhalkebar cross-border link to avoid load shedding during 18:00–21:00 peak.",
            "zones_affected": ["Kathmandu Valley", "Eastern Terai (Biratnagar)"],
            "mw_relief": 80,
            "co2_saved_tonnes": 0,
            "estimated_npr_savings": 1800000,
            "priority": "high",
        })
    else:
        recs.append({
            "title": "Initiate demand-side management in Kathmandu Valley",
            "description": "Reduce Kathmandu industrial load during 18:00–20:00 peak window through voluntary demand response program.",
            "zones_affected": ["Kathmandu Valley"],
            "mw_relief": 35,
            "co2_saved_tonnes": 24,
            "estimated_npr_savings": 950000,
            "priority": "medium",
        })

    recs.append({
        "title": "Optimize Kulekhani reservoir dispatch schedule",
        "description": "Shift Kulekhani dispatch from baseload to peak-shaving mode. Reserve storage for evening peak hours to reduce import costs.",
        "zones_affected": ["Kathmandu Valley", "Hilly Industrial Corridor (Hetauda–Muglin)"],
        "mw_relief": 45,
        "co2_saved_tonnes": 31,
        "estimated_npr_savings": 1350000,
        "priority": "medium",
    })

    return recs[:3]
