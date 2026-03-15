"""ML Prediction routes — historical data + future predictions using trained ML model."""

from fastapi import APIRouter, Query
from services.ml_service import (
    get_historical_data, predict_future, get_model_info,
    get_zone_predictions, get_all_zone_summary, get_cost_analysis,
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
):
    """Get ML-predicted daily values for the next N days."""
    predictions = predict_future(days=days if days > 0 else None)
    return {"count": len(predictions), "days": days, "data": predictions}


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
async def zone_summary():
    """Get predicted zone summaries for map coloring and risk curves (next 2 years)."""
    summaries = get_all_zone_summary()
    return {"count": len(summaries), "data": summaries}


@router.get("/cost-analysis")
async def cost_analysis():
    """Get cost impact analysis: seasonal import costs and export revenue projections."""
    data = get_cost_analysis()
    return data
