"""FastAPI router: /api/explain (SHAP, LIME, global importance)"""
from fastapi import APIRouter, Query, HTTPException
from app.schemas import (
    PredictRequest, ShapResponse, ShapFeature,
    LimeResponse, LimeFeature, GlobalShapResponse, GlobalShapFeature
)
from app.services.model_service import get_registry
from app.config import GLOBAL_SHAP

router = APIRouter(prefix="/api/explain", tags=["explain"])


@router.post("/shap", response_model=ShapResponse)
def shap_explanation(
    body: PredictRequest,
    model: str = Query(default=None),
):
    registry = get_registry()
    try:
        result = registry.shap_explanation(body.model_dump(), model_name=model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHAP computation failed: {e}")
    return ShapResponse(
        base_value=result["base_value"],
        shap_values=[ShapFeature(**f) for f in result["shap_values"]],
        prediction=result["prediction"],
    )


@router.post("/lime", response_model=LimeResponse)
def lime_explanation(
    body: PredictRequest,
    model: str = Query(default=None),
):
    registry = get_registry()
    try:
        result = registry.lime_explanation(body.model_dump(), model_name=model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LIME computation failed: {e}")
    return LimeResponse(
        features=[LimeFeature(**f) for f in result["features"]],
        prediction=result["prediction"],
    )


@router.get("/global", response_model=GlobalShapResponse)
def global_shap():
    """Pre-computed mean absolute SHAP values across the training dataset."""
    return GlobalShapResponse(
        features=[GlobalShapFeature(**f) for f in GLOBAL_SHAP]
    )
