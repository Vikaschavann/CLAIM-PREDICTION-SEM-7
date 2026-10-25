"""FastAPI router: /api/predict"""
from fastapi import APIRouter, Query, HTTPException
from app.schemas import PredictRequest, PredictResponse, TopFactor
from app.services.model_service import get_registry
from app.database import save_prediction

router = APIRouter(prefix="/api/predict", tags=["predict"])


@router.post("", response_model=PredictResponse)
def predict_claim(
    body: PredictRequest,
    model: str = Query(default=None, description="xgboost | lightgbm | catboost | neural_network"),
):
    registry = get_registry()
    try:
        result = registry.predict(body.model_dump(), model_name=model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Persist to SQLite
    pred_id = save_prediction(
        input_data=body.model_dump(),
        model_used=result["model_used"],
        prediction=result["prediction"],
        probability=result["probability"],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        top_factors=result["top_factors"],
    )

    return PredictResponse(
        prediction_id=pred_id,
        prediction=result["prediction"],
        probability=result["probability"],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        model_used=result["model_used"],
        top_factors=[TopFactor(**f) for f in result["top_factors"]],
    )
