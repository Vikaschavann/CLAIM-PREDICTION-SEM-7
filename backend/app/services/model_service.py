"""Model service: trains models at startup from insurance.csv and provides predict + SHAP."""
from __future__ import annotations
import logging, warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore")
logger = logging.getLogger("insuresight.model")

# ─── Encoding helpers ───────────────────────────────────────────────────────
AGE_MAP = {"16-25": 0, "26-39": 1, "40-64": 2, "65+": 3}
EXP_MAP = {"0-9y": 0, "10-19y": 1, "20-29y": 2, "30y+": 3}
EDU_MAP = {"none": 0, "high school": 1, "university": 2}
INC_MAP = {"poverty": 0, "working class": 1, "middle class": 2, "upper class": 3}
VY_MAP  = {"before 2015": 0, "after 2015": 1}
VT_MAP  = {"sedan": 0, "sports car": 1}
PC_MAP  = {"10238": 0, "21217": 1, "32765": 2, "92101": 3}

FEATURE_COLS = [
    "AGE", "DRIVING_EXPERIENCE", "EDUCATION", "INCOME",
    "CREDIT_SCORE", "VEHICLE_OWNERSHIP", "VEHICLE_YEAR",
    "MARRIED", "CHILDREN", "POSTAL_CODE", "ANNUAL_MILEAGE",
    "VEHICLE_TYPE", "SPEEDING_VIOLATIONS", "DUIS", "PAST_ACCIDENTS",
    "CREDIT_MISSING", "MILEAGE_MISSING", "VIOLATIONS_TOTAL", "HAS_PRIOR_ACCIDENT",
]

# Human-readable labels
FEATURE_LABELS = {
    "AGE": "Age",
    "DRIVING_EXPERIENCE": "Driving experience",
    "EDUCATION": "Education",
    "INCOME": "Income level",
    "CREDIT_SCORE": "Credit score",
    "VEHICLE_OWNERSHIP": "Vehicle ownership",
    "VEHICLE_YEAR": "Vehicle year",
    "MARRIED": "Married",
    "CHILDREN": "Children",
    "POSTAL_CODE": "Postal code",
    "ANNUAL_MILEAGE": "Annual mileage",
    "VEHICLE_TYPE": "Vehicle type",
    "SPEEDING_VIOLATIONS": "Speeding violations",
    "DUIS": "DUIs",
    "PAST_ACCIDENTS": "Past accidents",
    "CREDIT_MISSING": "Credit missing flag",
    "MILEAGE_MISSING": "Mileage missing flag",
    "VIOLATIONS_TOTAL": "Total violations",
    "HAS_PRIOR_ACCIDENT": "Has prior accident",
}


def encode_row(req: dict) -> dict:
    """Convert API request dict to numeric feature dict."""
    return {
        "AGE":                 AGE_MAP.get(req["age"], 1),
        "DRIVING_EXPERIENCE":  EXP_MAP.get(req["driving_experience"], 1),
        "EDUCATION":           EDU_MAP.get(req["education"], 1),
        "INCOME":              INC_MAP.get(req["income"], 2),
        "CREDIT_SCORE":        float(req["credit_score"]),
        "VEHICLE_OWNERSHIP":   int(req["vehicle_ownership"]),
        "VEHICLE_YEAR":        VY_MAP.get(req["vehicle_year"], 1),
        "MARRIED":             int(req["married"]),
        "CHILDREN":            int(req["children"]),
        "POSTAL_CODE":         PC_MAP.get(req["postal_code"], 0),
        "ANNUAL_MILEAGE":      float(req["annual_mileage"]),
        "VEHICLE_TYPE":        VT_MAP.get(req["vehicle_type"], 0),
        "SPEEDING_VIOLATIONS": int(req["speeding_violations"]),
        "DUIS":                int(req["duis"]),
        "PAST_ACCIDENTS":      int(req["past_accidents"]),
        "CREDIT_MISSING":      0,
        "MILEAGE_MISSING":     0,
        "VIOLATIONS_TOTAL":    int(req["speeding_violations"]) + int(req["duis"]),
        "HAS_PRIOR_ACCIDENT":  1 if int(req["past_accidents"]) > 0 else 0,
    }


def encode_value(col: str, val: Any) -> str:
    """Reverse-map numeric value to human label."""
    rev = {v: k for k, v in {
        "AGE": AGE_MAP, "DRIVING_EXPERIENCE": EXP_MAP, "EDUCATION": EDU_MAP,
        "INCOME": INC_MAP, "VEHICLE_YEAR": VY_MAP, "VEHICLE_TYPE": VT_MAP,
        "POSTAL_CODE": PC_MAP,
    }.get(col, {}).items()}
    if rev and val in rev:
        return rev[val]
    if col == "VEHICLE_OWNERSHIP":
        return "owns vehicle" if val == 1 else "does not own"
    if col == "MARRIED":
        return "yes" if val == 1 else "no"
    if col == "HAS_PRIOR_ACCIDENT":
        return "yes" if val == 1 else "no"
    return str(round(float(val), 4) if isinstance(val, float) else val)


class ModelRegistry:
    """Trains and holds all models + scalers for the lifetime of the process."""

    def __init__(self):
        self.models: dict[str, Any] = {}
        self.scaler = None
        self.X_train: np.ndarray | None = None
        self.feature_names: list[str] = FEATURE_COLS
        self.best_model_name: str = "xgboost"
        self.p_sorted: np.ndarray | None = None  # for percentile risk scoring
        self.metrics: dict[str, dict] = {}

    # ── data loading ────────────────────────────────────────────────────────
    @staticmethod
    def _load_data(csv_path: Path):
        df = pd.read_csv(csv_path)
        df = df.rename(columns={"OUTCOME": "target"})
        # encode categoricals
        df["AGE"] = df["AGE"].map(AGE_MAP).fillna(1).astype(int)
        df["DRIVING_EXPERIENCE"] = df["DRIVING_EXPERIENCE"].map(EXP_MAP).fillna(1).astype(int)
        df["EDUCATION"] = df["EDUCATION"].map(EDU_MAP).fillna(1).astype(int)
        df["INCOME"] = df["INCOME"].map(INC_MAP).fillna(2).astype(int)
        df["VEHICLE_YEAR"] = df["VEHICLE_YEAR"].map(VY_MAP).fillna(1).astype(int)
        df["VEHICLE_TYPE"] = df["VEHICLE_TYPE"].map(VT_MAP).fillna(0).astype(int)
        df["POSTAL_CODE"] = df["POSTAL_CODE"].map(PC_MAP).fillna(0).astype(int)
        # Numeric columns: fill NaN with median
        for col in ["ANNUAL_MILEAGE", "CREDIT_SCORE", "VEHICLE_OWNERSHIP", "MARRIED",
                    "CHILDREN", "SPEEDING_VIOLATIONS", "DUIS", "PAST_ACCIDENTS",
                    "CREDIT_MISSING", "MILEAGE_MISSING", "VIOLATIONS_TOTAL", "HAS_PRIOR_ACCIDENT"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].fillna(df[col].median() if not df[col].isna().all() else 0.0)
        X = df[FEATURE_COLS].astype(float).values
        y = df["target"].astype(int).values
        return X, y, df

    # ── training ────────────────────────────────────────────────────────────
    def startup(self, csv_path: Path):
        from sklearn.model_selection import train_test_split
        from sklearn.preprocessing import StandardScaler
        from sklearn.metrics import (
            roc_auc_score, accuracy_score, precision_score, recall_score, f1_score,
            confusion_matrix, roc_curve
        )
        import xgboost as xgb
        import lightgbm as lgb
        from catboost import CatBoostClassifier
        from sklearn.neural_network import MLPClassifier

        logger.info("Loading dataset from %s", csv_path)
        X, y, _df = self._load_data(csv_path)

        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

        self.scaler = StandardScaler()
        X_tr_s = self.scaler.fit_transform(X_tr)
        X_te_s = self.scaler.transform(X_te)

        self.X_train = X_tr_s   # for LIME background

        # ── XGBoost ────────────────────────────────────────────────────────
        logger.info("Training XGBoost …")
        xgb_model = xgb.XGBClassifier(
            n_estimators=400, learning_rate=0.05, max_depth=5,
            subsample=0.8, colsample_bytree=0.8, use_label_encoder=False,
            eval_metric="logloss", random_state=42, n_jobs=-1, verbosity=0
        )
        xgb_model.fit(X_tr_s, y_tr)
        self.models["xgboost"] = xgb_model

        # ── LightGBM ───────────────────────────────────────────────────────
        logger.info("Training LightGBM …")
        lgb_model = lgb.LGBMClassifier(
            n_estimators=400, learning_rate=0.05, num_leaves=31,
            subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1, verbose=-1
        )
        lgb_model.fit(X_tr_s, y_tr)
        self.models["lightgbm"] = lgb_model

        # ── CatBoost ───────────────────────────────────────────────────────
        logger.info("Training CatBoost …")
        cb_model = CatBoostClassifier(
            iterations=400, learning_rate=0.05, depth=5,
            random_seed=42, verbose=0
        )
        cb_model.fit(X_tr_s, y_tr)
        self.models["catboost"] = cb_model

        # ── Neural Network ─────────────────────────────────────────────────
        logger.info("Training Neural Network …")
        nn_model = MLPClassifier(
            hidden_layer_sizes=(128, 64), alpha=1e-3,
            learning_rate_init=1e-3, max_iter=200, random_state=42
        )
        nn_model.fit(X_tr_s, y_tr)
        self.models["neural_network"] = nn_model

        # ── Evaluate all ───────────────────────────────────────────────────
        best_auc, best_name = -1.0, "xgboost"
        for name, m in self.models.items():
            p = m.predict_proba(X_te_s)[:, 1]
            yhat = m.predict(X_te_s)
            auc = roc_auc_score(y_te, p)
            cm = confusion_matrix(y_te, yhat)
            fpr, tpr, _ = roc_curve(y_te, p)
            self.metrics[name] = {
                "accuracy":  accuracy_score(y_te, yhat),
                "precision": precision_score(y_te, yhat, zero_division=0),
                "recall":    recall_score(y_te, yhat, zero_division=0),
                "f1":        f1_score(y_te, yhat, zero_division=0),
                "roc_auc":   auc,
                "confusion_matrix": cm.tolist(),
                "fpr": fpr.tolist(),
                "tpr": tpr.tolist(),
            }
            if auc > best_auc:
                best_auc, best_name = auc, name
            logger.info("  %s: AUC=%.4f F1=%.4f", name, auc, self.metrics[name]["f1"])

        self.best_model_name = best_name
        # percentile risk scores from best model
        p_tr = self.models[best_name].predict_proba(X_tr_s)[:, 1]
        self.p_sorted = np.sort(p_tr)
        logger.info("Best model: %s (AUC=%.4f)", best_name, best_auc)

    # ── inference ───────────────────────────────────────────────────────────
    def predict(self, row: dict, model_name: str | None = None) -> dict:
        name = (model_name or self.best_model_name).lower()
        if name not in self.models:
            raise ValueError(f"Unknown model '{name}'. Available: {list(self.models)}")
        enc = encode_row(row)
        x = np.array([[enc[c] for c in FEATURE_COLS]], dtype=float)
        x_s = self.scaler.transform(x)
        m = self.models[name]
        prob = float(m.predict_proba(x_s)[0, 1])
        risk_score = int(round(prob * 100))
        risk_level = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        prediction = "Yes" if prob >= 0.50 else "No"

        # SHAP top factors
        top_factors = self._shap_top_factors(x_s, name, enc)

        return {
            "prediction": prediction,
            "probability": round(prob, 4),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "model_used": name,
            "top_factors": top_factors,
        }

    @staticmethod
    def _flatten_shap(sv, expected_value):
        """Robustly extract 1-D SHAP values for a single sample (positive class).

        Handles:
          - list of arrays  (LightGBM/XGBoost binary => index 1 is positive class)
          - 3-D array  (some SHAP versions return shape [1, n_features, 2])
          - 2-D array  (shape [1, n_features])
          - 1-D array  (shape [n_features])
        Also extracts the base value correctly.
        """
        # Unwrap list (binary classifiers)
        if isinstance(sv, list):
            sv = sv[1]
            if hasattr(expected_value, '__len__'):
                expected_value = expected_value[1]

        sv = np.asarray(sv)

        # 3-D: [samples, features, classes] — take last class (positive)
        if sv.ndim == 3:
            sv = sv[0, :, -1]
        # 2-D: [samples, features]
        elif sv.ndim == 2:
            sv = sv[0]
        # 1-D already fine (single sample squeezed)

        base = expected_value
        if hasattr(base, '__len__'):
            base = base[-1]        # take positive class
        return sv.astype(float), float(base)

    def _shap_top_factors(self, x_s: np.ndarray, model_name: str, enc: dict) -> list:
        import shap
        m = self.models[model_name]
        try:
            if model_name in ("xgboost", "lightgbm", "catboost"):
                explainer = shap.TreeExplainer(m)
                sv_raw = explainer.shap_values(x_s)
                shap_vals, base_val = self._flatten_shap(sv_raw, explainer.expected_value)
            else:
                bg = self.X_train[:100]
                explainer = shap.KernelExplainer(m.predict_proba, bg)
                sv_raw = explainer.shap_values(x_s, nsamples=50)
                shap_vals, base_val = self._flatten_shap(sv_raw, explainer.expected_value)
        except Exception as e:
            logger.warning("SHAP failed (%s), using zero fallback", e)
            shap_vals = np.zeros(len(FEATURE_COLS))
            base_val = 0.0

        factors = []
        for i, col in enumerate(FEATURE_COLS):
            sv_val = float(shap_vals[i])
            factors.append({
                "feature": FEATURE_LABELS.get(col, col),
                "value": encode_value(col, enc[col]),
                "shap_value": round(sv_val, 4),
                "direction": "increases" if sv_val >= 0 else "decreases",
            })
        factors.sort(key=lambda f: abs(f["shap_value"]), reverse=True)
        return factors[:5]

    def shap_explanation(self, row: dict, model_name: str | None = None) -> dict:
        """Full per-feature SHAP values for waterfall chart."""
        import shap
        name = (model_name or self.best_model_name).lower()
        enc = encode_row(row)
        x = np.array([[enc[c] for c in FEATURE_COLS]], dtype=float)
        x_s = self.scaler.transform(x)
        m = self.models[name]
        prob = float(m.predict_proba(x_s)[0, 1])
        try:
            if name in ("xgboost", "lightgbm", "catboost"):
                explainer = shap.TreeExplainer(m)
                sv_raw = explainer.shap_values(x_s)
                shap_vals, base_val = self._flatten_shap(sv_raw, explainer.expected_value)
            else:
                bg = self.X_train[:100]
                explainer = shap.KernelExplainer(m.predict_proba, bg)
                sv_raw = explainer.shap_values(x_s, nsamples=50)
                shap_vals, base_val = self._flatten_shap(sv_raw, explainer.expected_value)
        except Exception as e:
            logger.warning("SHAP waterfall failed: %s", e)
            shap_vals = np.zeros(len(FEATURE_COLS))
            base_val = 0.0

        features = [
            {
                "feature": FEATURE_LABELS.get(col, col),
                "shap_value": round(float(shap_vals[i]), 4),
                "value": encode_value(col, enc[col]),
            }
            for i, col in enumerate(FEATURE_COLS)
        ]
        features.sort(key=lambda f: abs(f["shap_value"]), reverse=True)
        return {"base_value": round(base_val, 4), "shap_values": features, "prediction": round(prob, 4)}

    def lime_explanation(self, row: dict, model_name: str | None = None) -> dict:
        """LIME explanation for one prediction."""
        from lime.lime_tabular import LimeTabularExplainer
        name = (model_name or self.best_model_name).lower()
        enc = encode_row(row)
        x = np.array([enc[c] for c in FEATURE_COLS], dtype=float)
        x_s = self.scaler.transform(x.reshape(1, -1))[0]
        m = self.models[name]
        prob = float(m.predict_proba(x_s.reshape(1, -1))[0, 1])

        explainer = LimeTabularExplainer(
            self.X_train,
            feature_names=[FEATURE_LABELS.get(c, c) for c in FEATURE_COLS],
            class_names=["No Claim", "Claim"],
            mode="classification",
            random_state=42,
        )
        exp = explainer.explain_instance(
            x_s,
            lambda X: self.models[name].predict_proba(X),
            num_features=10,
            num_samples=500,
        )
        features = []
        for feat_label, weight in exp.as_list():
            features.append({
                "feature": feat_label,
                "weight": round(float(weight), 4),
                "direction": "increases" if weight >= 0 else "decreases",
            })
        features.sort(key=lambda f: abs(f["weight"]), reverse=True)
        return {"features": features, "prediction": round(prob, 4)}


# Singleton
_registry: ModelRegistry | None = None


def get_registry() -> ModelRegistry:
    global _registry
    if _registry is None:
        raise RuntimeError("Model registry not initialized. Call init_registry() first.")
    return _registry


def init_registry(csv_path: Path) -> ModelRegistry:
    global _registry
    _registry = ModelRegistry()
    _registry.startup(csv_path)
    return _registry
