"""Central configuration for InsureSight backend."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Data / model paths
DATA_PATH = BASE_DIR / "data" / "insurance.csv"
MODELS_DIR = BASE_DIR / "models"

# Risk thresholds (probability-based)
RISK_THRESHOLDS = {"low": 0.40, "high": 0.70}
# score = round(probability * 100)

# Model registry: name -> joblib file relative to MODELS_DIR
MODEL_REGISTRY: dict[str, str] = {
    "xgboost": "xgboost_model.joblib",
    "lightgbm": "lightgbm_model.joblib",
    "catboost": "catboost_model.joblib",
    "neural_network": "neural_network_model.joblib",
}

# Column definitions matching test_split.csv
TARGET_COL = "OUTCOME"

CATEGORICAL_FEATURES = [
    "DRIVING_EXPERIENCE",
    "EDUCATION",
    "INCOME",
    "VEHICLE_YEAR",
    "VEHICLE_TYPE",
    "POSTAL_CODE",
]

NUMERIC_FEATURES = [
    "AGE_NUM",   # encoded
    "CREDIT_SCORE",
    "VEHICLE_OWNERSHIP",
    "MARRIED",
    "CHILDREN",
    "ANNUAL_MILEAGE",
    "SPEEDING_VIOLATIONS",
    "DUIS",
    "PAST_ACCIDENTS",
    "CREDIT_MISSING",
    "MILEAGE_MISSING",
    "VIOLATIONS_TOTAL",
    "HAS_PRIOR_ACCIDENT",
]

# Display labels for UI
AGE_BANDS = ["16-25", "26-39", "40-64", "65+"]
DRIVING_EXP_OPTIONS = ["0-9y", "10-19y", "20-29y", "30y+"]
EDUCATION_OPTIONS = ["none", "high school", "university"]
INCOME_OPTIONS = ["poverty", "working class", "middle class", "upper class"]
VEHICLE_YEAR_OPTIONS = ["before 2015", "after 2015"]
VEHICLE_TYPE_OPTIONS = ["sedan", "sports car"]
POSTAL_CODE_OPTIONS = ["10238", "21217", "32765", "92101"]

# Global SHAP importance (pre-computed from training)
GLOBAL_SHAP = [
    {"feature": "DRIVING_EXPERIENCE", "mean_abs_shap": 1.3165, "share_pct": 33.2},
    {"feature": "VEHICLE_OWNERSHIP",  "mean_abs_shap": 0.6754, "share_pct": 17.0},
    {"feature": "POSTAL_CODE",        "mean_abs_shap": 0.5777, "share_pct": 14.6},
    {"feature": "VEHICLE_YEAR",       "mean_abs_shap": 0.5612, "share_pct": 14.2},
    {"feature": "ANNUAL_MILEAGE",     "mean_abs_shap": 0.2071, "share_pct":  5.2},
    {"feature": "VIOLATIONS_TOTAL",   "mean_abs_shap": 0.1346, "share_pct":  3.4},
    {"feature": "MARRIED",            "mean_abs_shap": 0.1254, "share_pct":  3.2},
    {"feature": "CREDIT_SCORE",       "mean_abs_shap": 0.1024, "share_pct":  2.6},
    {"feature": "CHILDREN",           "mean_abs_shap": 0.0631, "share_pct":  1.6},
    {"feature": "AGE",                "mean_abs_shap": 0.0551, "share_pct":  1.4},
    {"feature": "INCOME",             "mean_abs_shap": 0.0464, "share_pct":  1.2},
    {"feature": "SPEEDING_VIOLATIONS","mean_abs_shap": 0.0276, "share_pct":  0.7},
    {"feature": "EDUCATION",          "mean_abs_shap": 0.0193, "share_pct":  0.5},
    {"feature": "PAST_ACCIDENTS",     "mean_abs_shap": 0.0186, "share_pct":  0.5},
]
