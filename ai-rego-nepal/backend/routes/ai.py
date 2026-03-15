"""AI routes — Recommendations and What-If Chat."""

from fastapi import APIRouter
from pydantic import BaseModel
from services.simulator import generate_grid_snapshot
from services.llm_service import get_recommendations, chat_what_if

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    question: str
    festival_mode: bool = False
    season: str | None = None


@router.get("/recommendations")
async def get_ai_recommendations(
    festival_mode: bool = False,
    season: str = None,
):
    """Get 3 AI-generated grid optimization recommendations."""
    grid_state = generate_grid_snapshot(
        festival_mode=festival_mode,
        season_override=season,
    )
    recommendations = await get_recommendations(grid_state)
    return {"recommendations": recommendations, "grid_context": grid_state["national_summary"]}


@router.post("/chat")
async def what_if_chat(req: ChatRequest):
    """Handle What-If scenario questions (bilingual EN/NP)."""
    grid_state = generate_grid_snapshot(
        festival_mode=req.festival_mode,
        season_override=req.season,
    )
    response = await chat_what_if(grid_state, req.question)
    return {
        "question": req.question,
        "response": response,
        "grid_context": grid_state["national_summary"],
    }
