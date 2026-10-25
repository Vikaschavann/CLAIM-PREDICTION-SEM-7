# InsureSight — Explainable AI-Based Insurance Claim Prediction & Risk Assessment

An end-to-end, full-stack machine learning web application that predicts policyholder insurance claim likelihood, provides local and global feature explainability using **SHAP** and **LIME**, and records live predictions and audit feedback in a **cloud PostgreSQL database (Supabase)**.

---

## 🌐 Live Deployments

- **Frontend (Web App):** [https://insuarance-claim-prediction.vercel.app](https://insuarance-claim-prediction.vercel.app) *(or [claim-prediction-sem-7.vercel.app](https://claim-prediction-sem-7.vercel.app))*
- **Backend API (Swagger Docs):** [https://insuarance-claim-prediction.onrender.com/docs](https://insuarance-claim-prediction.onrender.com/docs)
- **Database:** Supabase Cloud PostgreSQL (AWS Mumbai `ap-south-1`)

---

## 🏗 Architecture

```
CLAIM-PREDICTION-SEM-7/
├── backend/                  # FastAPI + Python 3.11 Backend
│   ├── app/
│   │   ├── main.py           # Application entrypoint & lifespan lifecycle
│   │   ├── database.py       # Dual DB layer (Supabase PostgreSQL + SQLite fallback)
│   │   ├── config.py         # App configuration & environment loader
│   │   ├── schemas.py        # Pydantic v2 data models & validation
│   │   ├── routers/          # Modular API endpoints
│   │   │   ├── predict.py    # /api/predict (real-time prediction & DB logging)
│   │   │   ├── history.py    # /api/history (database audit trail & user feedback)
│   │   │   ├── explain.py    # /api/explain (SHAP & LIME local/global explanations)
│   │   │   ├── dashboard.py  # /api/dashboard (portfolio KPIs & risk distribution)
│   │   │   ├── models.py     # /api/models (metrics, confusion matrix, ROC curve)
│   │   │   ├── eda.py        # /api/eda (claim rates, distributions, correlation)
│   │   │   └── profiles.py   # /api/profiles (paginated policyholder records)
│   │   └── services/         # Business & ML logic
│   │       ├── model_service.py # Model training, scaling, SHAP/LIME explainers
│   │       └── stats_service.py # Analytical statistics & feature calculations
│   ├── data/
│   │   └── insurance.csv     # Insurance dataset (10,000 policyholders)
│   ├── requirements.txt      # Python dependencies
│   ├── Procfile              # PaaS process configuration
│   └── Dockerfile            # Container specification
│
├── frontend/                 # React 18 + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── api/client.ts     # Axios client & TypeScript interfaces
│   │   ├── components/       # Reusable UI components
│   │   │   ├── KpiCard.tsx   # Stat summary card
│   │   │   ├── RiskBadge.tsx # Low / Medium / High badge
│   │   │   ├── RiskGauge.tsx # SVG circular risk gauge
│   │   │   ├── ShapBars.tsx  # Waterfall-style feature impact bar chart
│   │   │   ├── Sidebar.tsx   # Left navigation
│   │   │   └── Toast.tsx     # Notification alerts
│   │   ├── pages/            # Page views
│   │   │   ├── Dashboard.tsx        # Portfolio Overview & KPIs
│   │   │   ├── Predict.tsx          # Real-time claim prediction + explainability
│   │   │   ├── History.tsx          # Real-time database audit log & feedback
│   │   │   ├── RiskProfiles.tsx     # Searchable policyholder table
│   │   │   ├── Explainability.tsx   # Deep SHAP/LIME breakdown
│   │   │   ├── ModelPerformance.tsx # Multi-model comparison & ROC curves
│   │   │   └── DataExplorer.tsx     # EDA, claim rates, & correlation matrix
│   │   ├── App.tsx           # Client router
│   │   └── index.css         # Tailwind & custom design system
│   ├── vercel.json           # Vercel SPA routing configuration
│   └── package.json          # Dependencies & scripts
│
├── colab file/
│   └── SEM_7_FINAL.ipynb     # Jupyter/Colab model experimentation & training pipeline
├── render.yaml               # Render Cloud deployment blueprint
├── docker-compose.yml        # Multi-container local orchestration
└── DEPLOYMENT.md             # Complete step-by-step deployment guide
```

---

## 🤖 Machine Learning Models

The backend trains and compares four distinct model architectures on startup:

| Model | Description | Metric (ROC-AUC) |
| :--- | :--- | :--- |
| **CatBoost** | Gradient boosted decision trees handling categorical features natively | **~0.85** (Top Performer) |
| **XGBoost** | Optimized distributed gradient boosting | ~0.84 |
| **LightGBM** | Fast histogram-based gradient boosted trees | ~0.84 |
| **Neural Network** | Multi-Layer Perceptron (MLP) Classifier with early stopping | ~0.82 |

### Explainable AI (XAI)
* **SHAP (SHapley Additive exPlanations):** Calculates exact game-theoretic marginal feature contributions for each individual prediction and global portfolio importance.
* **LIME (Local Interpretable Model-agnostic Explanations):** Generates local linear surrogate approximations to explain individual decisions in real time.

---

## 🗄️ Database Architecture (Dual Layer)

* **Cloud Mode (Production):** Automatically connects to **Supabase PostgreSQL** when `DATABASE_URL` is set in the environment.
* **Local Mode (Fallback):** Automatically falls back to high-concurrency WAL-mode **SQLite** (`backend/data/insuresight.db`) if no cloud database URL is configured.
* **Tables Created Automatically:**
  1. `predictions`: Logs every prediction with input features, model selected, probability, risk score, risk level, and top SHAP factors.
  2. `feedback`: Stores auditor / user feedback (👍 accurate / 👎 inaccurate) linked by prediction ID for continuous model monitoring.

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & uptime status |
| `POST` | `/api/predict` | Predict claim likelihood, compute SHAP factors, and save to DB |
| `GET` | `/api/history` | Paginated prediction audit log with risk & model filters |
| `GET` | `/api/history/stats` | Database summary counts (total, risk breakdown, model breakdown) |
| `POST` | `/api/history/feedback` | Submit user feedback (👍 / 👎) on a prediction |
| `POST` | `/api/explain/shap` | Single-prediction SHAP waterfall values |
| `POST` | `/api/explain/lime` | Single-prediction LIME feature weights |
| `GET` | `/api/explain/global` | Global mean absolute SHAP values across all features |
| `GET` | `/api/dashboard/summary` | Portfolio KPIs, claims by month, risk distributions |
| `GET` | `/api/models/performance` | Model comparison (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix) |
| `GET` | `/api/profiles` | Searchable, sortable policyholder profiles from dataset |
| `GET` | `/api/eda/claim-rates` | Claim rate by feature categories |
| `GET` | `/api/eda/distributions` | Numeric feature distribution bins |
| `GET` | `/api/eda/correlation` | Pearson correlation matrix |

---

## 🚀 Running Locally

### Option 1: Using Docker Compose
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs`

### Option 2: Running Directly

**1. Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**2. Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📄 Academic Project Reference
Developed for **Semester 7 Major Project** on *Explainable AI in Insurance Risk Management*.  
Detailed experimentation, model tuning, and evaluation scripts are available in [`colab file/SEM_7_FINAL.ipynb`](colab%20file/SEM_7_FINAL.ipynb).
