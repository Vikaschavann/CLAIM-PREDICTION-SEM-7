# InsureSight — Explainable AI-Based Insurance Claim Prediction

A full-stack web application that predicts whether a policyholder will file an insurance
claim, explains **why** using SHAP and LIME, and provides an interactive risk dashboard.

---

## Architecture

```
insuresight/
  backend/   FastAPI + Python 3.11 — trains 4 models at startup, serves REST API
  frontend/  React + Vite + TypeScript + Tailwind CSS — 6-page SPA
```

---

## Quick Start

### 1. Backend

```bash
cd insuresight/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend **trains all 4 models (XGBoost, LightGBM, CatBoost, Neural Network)
from `data/insurance.csv` on first startup** — takes ~30-60 seconds.

- API docs: http://localhost:8000/docs
- Health:   http://localhost:8000/api/health

### 2. Frontend

```bash
cd insuresight/frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/predict?model=catboost` | Predict claim + top SHAP factors |
| POST | `/api/explain/shap` | Full SHAP waterfall for one prediction |
| POST | `/api/explain/lime` | LIME explanation for one prediction |
| GET | `/api/explain/global` | Global mean |SHAP| per feature |
| GET | `/api/dashboard/summary` | Portfolio KPIs, monthly chart, highest-risk table |
| GET | `/api/models/performance` | Accuracy, precision, recall, F1, AUC, confusion matrix, ROC |
| GET | `/api/profiles?risk_level=High&age=16-25&search=PL-` | Filterable risk profile table |
| GET | `/api/eda/claim-rates` | Claim rate by feature category |
| GET | `/api/eda/distributions` | Numeric feature histograms |
| GET | `/api/eda/correlation` | Pearson correlation matrix |

### POST /api/predict — Request body

```json
{
  "age": "16-25",
  "driving_experience": "0-9y",
  "education": "none",
  "income": "poverty",
  "credit_score": 0.4,
  "vehicle_ownership": 0,
  "vehicle_year": "before 2015",
  "married": 0,
  "children": 0,
  "postal_code": "21217",
  "annual_mileage": 20000,
  "vehicle_type": "sports car",
  "speeding_violations": 3,
  "duis": 1,
  "past_accidents": 2
}
```

### Response

```json
{
  "prediction": "Yes",
  "probability": 0.78,
  "risk_score": 78,
  "risk_level": "High",
  "model_used": "catboost",
  "top_factors": [
    { "feature": "Driving experience", "value": "0-9y", "shap_value": 1.10, "direction": "increases" },
    ...
  ]
}
```

---

## Risk Score & Level

| Score | Level |
|-------|-------|
| 0–39  | Low   |
| 40–69 | Medium |
| 70–100 | High |

`risk_score = round(probability × 100)`

---

## How to Swap In Your Own Models

The system trains fresh models at startup from `data/insurance.csv`.
If you want to use your own pre-trained models:

1. Save your model(s) with `joblib.dump(model, "backend/models/catboost_model.joblib")`
2. In `app/services/model_service.py`, replace the training block for the relevant model
   with `self.models["catboost"] = joblib.load(MODELS_DIR / "catboost_model.joblib")`
3. Keep `self.scaler` consistent with how your model was trained.

---

## Run Tests

```bash
cd insuresight/backend
pytest tests/ -v
```

---

## Docker (Optional)

```bash
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:8000

---

## Feature Reference

| Field | Type | Options / Range |
|-------|------|-----------------|
| age | category | 16-25, 26-39, 40-64, 65+ |
| driving_experience | category | 0-9y, 10-19y, 20-29y, 30y+ |
| education | category | none, high school, university |
| income | category | poverty, working class, middle class, upper class |
| credit_score | float | 0.0–1.0 |
| vehicle_ownership | int | 0 or 1 |
| vehicle_year | category | before 2015, after 2015 |
| married | int | 0 or 1 |
| children | int | 0–10 |
| postal_code | category | 10238, 21217, 32765, 92101 |
| annual_mileage | float | 0–50000 |
| vehicle_type | category | sedan, sports car |
| speeding_violations | int | 0–25 |
| duis | int | 0–10 |
| past_accidents | int | 0–15 |
