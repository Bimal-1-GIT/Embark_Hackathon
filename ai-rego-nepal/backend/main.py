"""
AI REGO — Nepal Edition
FastAPI backend for Nepal grid intelligence platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager
from routes.grid import router as grid_router
from routes.forecast import router as forecast_router
from routes.ai import router as ai_router
from routes.ml import router as ml_router
from services.ml_service import startup as ml_startup


@asynccontextmanager
async def lifespan(app):
    # Train ML models and pre-compute predictions at startup
    ml_startup()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="AI REGO Nepal",
    description="AI-powered smart grid demand forecasting and load intelligence for Nepal Electricity Authority (NEA)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(grid_router)
app.include_router(forecast_router)
app.include_router(ai_router)
app.include_router(ml_router)


@app.get("/")
async def root():
    return {
        "name": "AI REGO Nepal",
        "description": "AI Grid Intelligence for Nepal Electricity Authority",
        "version": "1.0.0",
        "endpoints": {
            "grid_snapshot": "/api/grid/snapshot",
            "zones": "/api/grid/zones",
            "forecast": "/api/forecast/",
            "recommendations": "/api/ai/recommendations",
            "chat": "/api/ai/chat",
            "ml_historical": "/api/ml/historical",
            "ml_predict": "/api/ml/predict",
            "ml_model_info": "/api/ml/model-info",
            "ml_zone_predict": "/api/ml/zone-predict",
            "ml_zone_summary": "/api/ml/zone-summary",
        },
    }
