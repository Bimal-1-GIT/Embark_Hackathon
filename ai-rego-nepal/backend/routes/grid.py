"""Grid state routes — real-time Nepal grid snapshot."""

from fastapi import APIRouter, Query
from services.simulator import generate_grid_snapshot, generate_alerts

router = APIRouter(prefix="/api/grid", tags=["grid"])


@router.get("/snapshot")
async def get_grid_snapshot(
    festival_mode: bool = Query(False, description="Enable Dashain/Tihar festival surge"),
    season: str = Query(None, description="Override season: 'monsoon' or 'dry'"),
):
    """Get current Nepal grid state snapshot with all 8 zones."""
    snapshot = generate_grid_snapshot(
        festival_mode=festival_mode,
        season_override=season,
    )
    alerts = generate_alerts(snapshot)
    snapshot["alerts"] = alerts
    return snapshot


@router.get("/zones")
async def get_zones():
    """Get static zone metadata."""
    from services.simulator import ZONES
    return ZONES
