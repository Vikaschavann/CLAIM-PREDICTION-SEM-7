"""FastAPI router: /api/models (performance metrics)"""
from fastapi import APIRouter
from app.schemas import ModelPerformanceResponse, ModelMetric, ConfusionMatrixCell, RocPoint
from app.services.model_service import get_registry

router = APIRouter(prefix="/api/models", tags=["models"])

_perf_cache: dict = {}

MODEL_DISPLAY_NAMES = {
    "xgboost": "XGBoost",
    "lightgbm": "LightGBM",
    "catboost": "CatBoost",
    "neural_network": "Neural Network",
}


@router.get("/performance", response_model=ModelPerformanceResponse)
def model_performance():
    if "data" not in _perf_cache:
        registry = get_registry()
        best = registry.best_model_name
        metrics_list = []
        for name, m in registry.metrics.items():
            metrics_list.append(ModelMetric(
                model=MODEL_DISPLAY_NAMES.get(name, name),
                accuracy=round(m["accuracy"], 4),
                precision=round(m["precision"], 4),
                recall=round(m["recall"], 4),
                f1=round(m["f1"], 4),
                roc_auc=round(m["roc_auc"], 4),
                is_best=(name == best),
            ))
        # Sort: best first
        metrics_list.sort(key=lambda x: -x.roc_auc)

        # Confusion matrix for best model
        cm = registry.metrics[best]["confusion_matrix"]
        total = sum(sum(r) for r in cm)
        cm_cells = [
            ConfusionMatrixCell(actual="Actual No",  predicted="Predicted No", value=round(cm[0][0]/total*100, 1)),
            ConfusionMatrixCell(actual="Actual No",  predicted="Predicted Yes", value=round(cm[0][1]/total*100, 1)),
            ConfusionMatrixCell(actual="Actual Yes", predicted="Predicted No", value=round(cm[1][0]/total*100, 1)),
            ConfusionMatrixCell(actual="Actual Yes", predicted="Predicted Yes", value=round(cm[1][1]/total*100, 1)),
        ]

        # ROC curve (downsample to 100 points)
        fpr = registry.metrics[best]["fpr"]
        tpr = registry.metrics[best]["tpr"]
        step = max(1, len(fpr) // 100)
        roc_pts = [RocPoint(fpr=round(fpr[i], 4), tpr=round(tpr[i], 4))
                   for i in range(0, len(fpr), step)]

        _perf_cache["data"] = ModelPerformanceResponse(
            models=metrics_list,
            confusion_matrix=cm_cells,
            roc_curve=roc_pts,
            best_model=MODEL_DISPLAY_NAMES.get(best, best),
        )
    return _perf_cache["data"]
