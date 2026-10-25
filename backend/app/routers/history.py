"""FastAPI router: /api/history — prediction history and feedback (backed by SQLite)."""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.database import (
    list_predictions,
    get_prediction,
    count_predictions,
    save_feedback,
    get_feedback_for_prediction,
)

router = APIRouter(prefix="/api/history", tags=["history"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    prediction_id: str
    is_correct: bool
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    message: str


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("")
def prediction_history(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    risk_level: Optional[str] = Query(default=None),
    model: Optional[str] = Query(default=None),
):
    """Paginated list of past predictions."""
    return list_predictions(limit=limit, offset=offset, risk_level=risk_level, model=model)


@router.get("/stats")
def prediction_stats():
    """Summary counts for the prediction history dashboard."""
    return count_predictions()


@router.get("/{prediction_id}")
def single_prediction(prediction_id: str):
    """Retrieve a single prediction by ID."""
    pred = get_prediction(prediction_id)
    if pred is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    pred["feedback"] = get_feedback_for_prediction(prediction_id)
    return pred


@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(body: FeedbackRequest):
    """Submit user feedback (correct/incorrect) on a prediction."""
    # Verify prediction exists
    if get_prediction(body.prediction_id) is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    fb_id = save_feedback(body.prediction_id, body.is_correct, body.comment)
    return FeedbackResponse(id=fb_id, message="Feedback recorded. Thank you!")
