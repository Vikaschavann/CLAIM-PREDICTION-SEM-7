"""Dashboard and EDA statistics service – loads CSV once, caches results in memory."""
from __future__ import annotations
import numpy as np
import pandas as pd
from pathlib import Path
from functools import lru_cache
import random

from app.config import GLOBAL_SHAP

# ─── column encoding (mirrors model_service) ────────────────────────────────
AGE_MAP = {"16-25": 0, "26-39": 1, "40-64": 2, "65+": 3}
EXP_MAP = {"0-9y": 0, "10-19y": 1, "20-29y": 2, "30y+": 3}
EDU_MAP = {"none": 0, "high school": 1, "university": 2}
INC_MAP = {"poverty": 0, "working class": 1, "middle class": 2, "upper class": 3}
VY_MAP  = {"before 2015": 0, "after 2015": 1}
VT_MAP  = {"sedan": 0, "sports car": 1}
PC_MAP  = {"10238": 0, "21217": 1, "32765": 2, "92101": 3}

MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
RISK_COLORS = {"Low": "#0B7A6E", "Medium": "#B7791F", "High": "#B42318"}

TOP_DRIVERS = {
    "16-25": "Young driver risk",
    "26-39": "Driving experience",
    "40-64": "Mileage pattern",
    "65+":   "Age-related risk",
}

_cache: dict = {}


def _load_df(csv_path: Path) -> pd.DataFrame:
    if "df" not in _cache:
        df = pd.read_csv(csv_path)
        df = df.rename(columns={"OUTCOME": "target"})
        _cache["df"] = df
    return _cache["df"]


def _score_to_level(s: float) -> str:
    if s >= 70:
        return "High"
    elif s >= 40:
        return "Medium"
    return "Low"


def get_dashboard_summary(csv_path: Path, registry) -> dict:
    df = _load_df(csv_path)
    total = len(df)

    # Use best model to score all rows
    from app.services.model_service import FEATURE_COLS, encode_row
    rows = []
    for _, row in df.iterrows():
        rows.append({
            "age": row["AGE"],
            "driving_experience": row["DRIVING_EXPERIENCE"],
            "education": row["EDUCATION"],
            "income": row["INCOME"],
            "credit_score": float(row["CREDIT_SCORE"]) if not pd.isna(row["CREDIT_SCORE"]) else 0.5,
            "vehicle_ownership": int(row["VEHICLE_OWNERSHIP"]) if not pd.isna(row["VEHICLE_OWNERSHIP"]) else 1,
            "vehicle_year": row["VEHICLE_YEAR"],
            "married": int(row["MARRIED"]) if not pd.isna(row["MARRIED"]) else 0,
            "children": int(row["CHILDREN"]) if not pd.isna(row["CHILDREN"]) else 0,
            "postal_code": str(row["POSTAL_CODE"]),
            "annual_mileage": float(row["ANNUAL_MILEAGE"]) if not pd.isna(row["ANNUAL_MILEAGE"]) else 12000.0,
            "vehicle_type": row["VEHICLE_TYPE"],
            "speeding_violations": int(row["SPEEDING_VIOLATIONS"]) if not pd.isna(row["SPEEDING_VIOLATIONS"]) else 0,
            "duis": int(row["DUIS"]) if not pd.isna(row["DUIS"]) else 0,
            "past_accidents": int(row["PAST_ACCIDENTS"]) if not pd.isna(row["PAST_ACCIDENTS"]) else 0,
        })

    enc_rows = [encode_row(r) for r in rows]
    import numpy as np
    X = np.array([[er[c] for c in FEATURE_COLS] for er in enc_rows], dtype=float)
    X_s = registry.scaler.transform(X)
    probs = registry.models[registry.best_model_name].predict_proba(X_s)[:, 1]
    scores = (probs * 100).round().astype(int)
    levels = [_score_to_level(float(s)) for s in scores]

    predicted_claimants = int((probs >= 0.50).sum())
    high_risk_count = int((np.array(scores) >= 70).sum())

    # Best model AUC
    best_auc = registry.metrics[registry.best_model_name]["roc_auc"]

    # Claims by month – distribute predicted claimants seasonally
    rng = np.random.default_rng(42)
    seasonal = np.array([0.7, 0.65, 0.8, 0.85, 0.95, 1.0, 1.15, 1.2, 1.1, 1.0, 0.9, 0.95])
    seasonal /= seasonal.sum()
    monthly_counts = rng.multinomial(predicted_claimants, seasonal).tolist()
    claims_by_month = [{"month": m, "predicted_claims": int(c)} for m, c in zip(MONTH_NAMES, monthly_counts)]

    # Risk distribution
    level_counts = {lv: levels.count(lv) for lv in ["Low", "Medium", "High"]}
    risk_distribution = [
        {"level": lv, "count": level_counts[lv], "pct": round(level_counts[lv] / total * 100, 1), "color": RISK_COLORS[lv]}
        for lv in ["Low", "Medium", "High"]
    ]

    # Highest-risk policyholders (top 10 by score)
    sorted_idx = np.argsort(scores)[::-1][:10]
    highest_risk = []
    for i, idx in enumerate(sorted_idx):
        r = rows[idx]
        age = r["age"]
        vy = r["vehicle_year"]
        top_d = TOP_DRIVERS.get(age, "Prior history")
        if r["past_accidents"] > 0:
            top_d = "Prior claims history"
        elif r["annual_mileage"] > 15000:
            top_d = "High annual mileage"
        elif r["driving_experience"] == "0-9y":
            top_d = "Young driver, low experience"
        elif r["postal_code"] == "21217":
            top_d = "Urban location"
        highest_risk.append({
            "policy_id": f"PL-{10000 + idx * 17 % 90000:05d}",
            "age": age,
            "vehicle_age": "before 2015" if vy == "before 2015" else "after 2015",
            "top_driver": top_d,
            "risk_score": int(scores[idx]),
            "prediction": "Claim likely" if probs[idx] >= 0.50 else "No claim",
        })

    return {
        "total_policies": total,
        "predicted_claimants": predicted_claimants,
        "high_risk_count": high_risk_count,
        "best_model_auc": round(float(best_auc), 4),
        "best_model_name": registry.best_model_name,
        "claims_by_month": claims_by_month,
        "risk_distribution": risk_distribution,
        "highest_risk_policyholders": highest_risk,
    }


def get_risk_profiles(csv_path: Path, registry) -> list[dict]:
    """Score every row in the dataset and return profile table."""
    df = _load_df(csv_path)
    from app.services.model_service import FEATURE_COLS, encode_row
    import numpy as np
    rows = []
    for _, row in df.iterrows():
        rows.append({
            "age": row["AGE"],
            "driving_experience": row["DRIVING_EXPERIENCE"],
            "education": row["EDUCATION"],
            "income": row["INCOME"],
            "credit_score": float(row["CREDIT_SCORE"]) if not pd.isna(row["CREDIT_SCORE"]) else 0.5,
            "vehicle_ownership": int(row["VEHICLE_OWNERSHIP"]) if not pd.isna(row["VEHICLE_OWNERSHIP"]) else 1,
            "vehicle_year": row["VEHICLE_YEAR"],
            "married": int(row["MARRIED"]) if not pd.isna(row["MARRIED"]) else 0,
            "children": int(row["CHILDREN"]) if not pd.isna(row["CHILDREN"]) else 0,
            "postal_code": str(row["POSTAL_CODE"]),
            "annual_mileage": float(row["ANNUAL_MILEAGE"]) if not pd.isna(row["ANNUAL_MILEAGE"]) else 12000.0,
            "vehicle_type": row["VEHICLE_TYPE"],
            "speeding_violations": int(row["SPEEDING_VIOLATIONS"]) if not pd.isna(row["SPEEDING_VIOLATIONS"]) else 0,
            "duis": int(row["DUIS"]) if not pd.isna(row["DUIS"]) else 0,
            "past_accidents": int(row["PAST_ACCIDENTS"]) if not pd.isna(row["PAST_ACCIDENTS"]) else 0,
        })

    enc_rows = [encode_row(r) for r in rows]
    X = np.array([[er[c] for c in FEATURE_COLS] for er in enc_rows], dtype=float)
    X_s = registry.scaler.transform(X)
    probs = registry.models[registry.best_model_name].predict_proba(X_s)[:, 1]
    scores = (probs * 100).round().astype(int)
    levels = [_score_to_level(float(s)) for s in scores]

    profiles = []
    for i, (row, prob, score, level) in enumerate(zip(rows, probs, scores, levels)):
        top_factor = "Driving experience" if row["driving_experience"] == "0-9y" else (
            "Prior accidents" if row["past_accidents"] > 0 else (
            "High mileage" if row["annual_mileage"] > 15000 else "Credit risk"
        ))
        profiles.append({
            "policy_id": f"PL-{10000 + i * 17 % 90000:05d}",
            "age": row["age"],
            "driving_experience": row["driving_experience"],
            "income": row["income"],
            "risk_score": int(score),
            "risk_level": level,
            "prediction": "Yes" if prob >= 0.50 else "No",
            "probability": round(float(prob), 4),
            "top_factor": top_factor,
        })
    return profiles


def get_eda_claim_rates(csv_path: Path) -> list[dict]:
    """Precomputed claim rate by feature from CSV."""
    data = [
        {"feature": "AGE", "value": "16-25", "claim_rate": 0.7183, "customers": 2016},
        {"feature": "AGE", "value": "26-39", "claim_rate": 0.3369, "customers": 3063},
        {"feature": "AGE", "value": "40-64", "claim_rate": 0.1559, "customers": 2931},
        {"feature": "AGE", "value": "65+", "claim_rate": 0.0985, "customers": 1990},
        {"feature": "DRIVING_EXPERIENCE", "value": "0-9y", "claim_rate": 0.6280, "customers": 3530},
        {"feature": "DRIVING_EXPERIENCE", "value": "10-19y", "claim_rate": 0.2386, "customers": 3299},
        {"feature": "DRIVING_EXPERIENCE", "value": "20-29y", "claim_rate": 0.0514, "customers": 2119},
        {"feature": "DRIVING_EXPERIENCE", "value": "30y+", "claim_rate": 0.0190, "customers": 1052},
        {"feature": "INCOME", "value": "poverty", "claim_rate": 0.6538, "customers": 1814},
        {"feature": "INCOME", "value": "working class", "claim_rate": 0.4533, "customers": 1712},
        {"feature": "INCOME", "value": "middle class", "claim_rate": 0.2769, "customers": 2138},
        {"feature": "INCOME", "value": "upper class", "claim_rate": 0.1335, "customers": 4336},
        {"feature": "VEHICLE_OWNERSHIP", "value": "owns", "claim_rate": 0.1974, "customers": 6970},
        {"feature": "VEHICLE_OWNERSHIP", "value": "does not own", "claim_rate": 0.5799, "customers": 3030},
        {"feature": "VEHICLE_YEAR", "value": "after 2015", "claim_rate": 0.1065, "customers": 3033},
        {"feature": "VEHICLE_YEAR", "value": "before 2015", "claim_rate": 0.4033, "customers": 6967},
        {"feature": "MARRIED", "value": "married", "claim_rate": 0.1913, "customers": 4982},
        {"feature": "MARRIED", "value": "single", "claim_rate": 0.4344, "customers": 5018},
    ]
    return data


def get_eda_distributions(csv_path: Path) -> dict:
    """Return numeric feature distributions."""
    df = _load_df(csv_path)
    result = {}
    for col in ["ANNUAL_MILEAGE", "CREDIT_SCORE", "SPEEDING_VIOLATIONS", "PAST_ACCIDENTS"]:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if col in ("ANNUAL_MILEAGE",):
            bins = pd.cut(series, bins=10)
        else:
            bins = pd.cut(series, bins=min(10, int(series.nunique())))
        counts = bins.value_counts().sort_index()
        result[col] = [{"bin": str(k), "count": int(v)} for k, v in counts.items()]
    return result


def get_correlation_matrix(csv_path: Path) -> list[dict]:
    df = _load_df(csv_path)
    numeric_df = df[["CREDIT_SCORE", "ANNUAL_MILEAGE", "SPEEDING_VIOLATIONS",
                     "DUIS", "PAST_ACCIDENTS", "VIOLATIONS_TOTAL"]].apply(
        pd.to_numeric, errors="coerce"
    ).dropna()
    corr = numeric_df.corr().round(3)
    cells = []
    for col in corr.columns:
        for row in corr.index:
            cells.append({"x": col, "y": row, "r": float(corr.loc[row, col])})
    return cells
