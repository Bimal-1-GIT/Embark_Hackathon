"""Forecast routes — 72-hour demand/supply forecast."""

from fastapi import APIRouter, Query
from services.simulator import generate_forecast

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/")
async def get_forecast(
    hours: int = Query(72, ge=1, le=168, description="Forecast horizon in hours"),
    festival_mode: bool = Query(False, description="Enable Dashain/Tihar festival surge"),
    season: str = Query(None, description="Override season: 'monsoon' or 'dry'"),
):
    """Get hourly demand/supply forecast for the next N hours."""
    forecast = generate_forecast(
        hours=hours,
        festival_mode=festival_mode,
        season_override=season,
    )
    return {"hours": hours, "forecast": forecast}
