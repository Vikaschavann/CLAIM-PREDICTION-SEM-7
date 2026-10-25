# InsureSight — Frontend Web Application

The frontend client for the InsureSight Claim Prediction & Explainable AI platform, built with **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 🚀 Live Demo
- **Production URL:** [https://insuarance-claim-prediction.vercel.app](https://insuarance-claim-prediction.vercel.app) *(or [claim-prediction-sem-7.vercel.app](https://claim-prediction-sem-7.vercel.app))*

---

## 📱 Features & Pages

1. **Dashboard (`/`):** High-level insurance portfolio overview with key KPI metrics, monthly claim trends, and risk distribution charts.
2. **Predict Claim (`/predict`):** Interactive policyholder risk assessment form with circular risk gauge, real-time SHAP/LIME explanation waterfall, and live database persistence with 👍/👎 feedback.
3. **Prediction Log (`/history`):** Complete audit trail of predictions stored in the database, with filtering by risk level and model used, plus auditor validation controls.
4. **Risk Profiles (`/profiles`):** Searchable, sortable, and filterable database of 10,000 policyholder records.
5. **Explainability (`/explainability`):** Global feature impact analysis and comparative local XAI visualizations.
6. **Model Performance (`/performance`):** Multi-model evaluation dashboard comparing CatBoost, XGBoost, LightGBM, and Neural Network metrics, ROC curves, and confusion matrices.
7. **Data Explorer (`/explorer`):** Exploratory data analysis (EDA) with claim rates by feature, distributions, and interactive correlation matrices.

---

## 🛠 Tech Stack

- **Framework:** React 18 + Vite 5 + TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS custom variables
- **Charts:** Recharts
- **HTTP Client:** Axios (configured with environment-based base URL)
- **Icons:** SVG vector icons
- **Hosting:** Vercel (configured with `vercel.json` for client-side routing)

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local dev server (proxies /api to http://localhost:8000)
npm run dev

# 3. Build for production
npm run build
```

### Environment Configuration
Create a `.env.local` file for custom API targets:
```env
VITE_API_URL=http://localhost:8000
```
On Vercel, this variable points to the deployed Render backend:
```env
VITE_API_URL=https://insuarance-claim-prediction.onrender.com
```
