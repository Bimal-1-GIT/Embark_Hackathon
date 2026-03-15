"""ML Prediction routes — historical data + future predictions using trained ML model."""

from fastapi import APIRouter, Query
from services.ml_service import get_historical_data, predict_future, get_model_info

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
