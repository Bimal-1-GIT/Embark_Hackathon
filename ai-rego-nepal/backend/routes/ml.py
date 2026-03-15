"""ML Prediction routes — historical data + future predictions using trained ML model."""

from fastapi import APIRouter, Query
from services.ml_service import (
    get_historical_data, predict_future, get_model_info,
    get_zone_predictions, get_all_zone_summary, get_cost_analysis,
    predict_what_if,
)

router = APIRouter(prefix="/api/ml", tags=["ml"])


@router.get("/historical")
async def historical_data():
    """Get daily-aggregated historical data from the CSV."""
    data = get_historical_data()
    return {"count": len(data), "data": data}


@router.get("/predict")
async def predict(
    days: int = Query(0, ge=0, le=1100, description="Number of days to predict (0 = all cached)"),
    rainfall_factor: float = Query(1.0, ge=0.0, le=3.0, description="Rainfall factor for What-If scenarios (1.0 = normal, 0.7 = 30% below normal)"),
):
    """Get ML-predicted daily values for the next N days.
    Use rainfall_factor for What-If scenario modeling:
    - 1.0 = normal rainfall (default, uses cached predictions)
    - 0.7 = 30% below normal rainfall (drought scenario)
    - 1.3 = 30% above normal rainfall (heavy monsoon scenario)
    """
    d = days if days > 0 else None
    if abs(rainfall_factor - 1.0) < 0.01:
        predictions = predict_future(days=d)
    else:
        predictions = predict_what_if(rainfall_factor=rainfall_factor, days=d)
    return {
        "count": len(predictions),
        "days": days,
        "rainfall_factor": rainfall_factor,
        "data": predictions,
    }


@router.get("/model-info")
async def model_info():
    """Get information about the trained ML model."""
    info = get_model_info()
    return info


@router.get("/zone-predict")
async def zone_predict(
    zone_id: int = Query(None, ge=1, le=8, description="Zone ID (1-8). Omit for all zones."),
    days: int = Query(0, ge=0, le=800, description="Number of days to predict (0 = all cached)"),
):
    """Get ML-predicted daily values per zone. Returns load_mw, utilization_pct, and load shedding risk."""
    preds = get_zone_predictions(zone_id=zone_id, days=days if days > 0 else None)
    total = sum(len(v) for v in preds.values())
    return {"count": total, "zone_id": zone_id, "days": days, "data": preds}


@router.get("/zone-summary")
async def zone_summary(
    rainfall_factor: float = Query(1.0, ge=0.0, le=3.0, description="Rainfall factor for What-If scenarios (1.0 = normal)"),
):
    """Get predicted zone summaries for map coloring and risk curves (next 2 years).
    Use rainfall_factor to see how drought/heavy rain changes zone statuses."""
    summaries = get_all_zone_summary(rainfall_factor=rainfall_factor)
    return {"count": len(summaries), "rainfall_factor": rainfall_factor, "data": summaries}


@router.get("/cost-analysis")
async def cost_analysis(
    rainfall_factor: float = Query(1.0, ge=0.0, le=3.0, description="Rainfall factor for What-If scenarios (1.0 = normal)"),
):
    """Get cost impact analysis: seasonal import costs and export revenue projections.
    Use rainfall_factor to see how drought/heavy rain changes import costs."""
    data = get_cost_analysis(rainfall_factor=rainfall_factor)
    return data
