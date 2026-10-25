# InsureSight Deployment & Setup Guide

This project is fully deployed and configured:
- **Cloud Database:** [Supabase](https://supabase.com) (PostgreSQL) with automatic local SQLite fallback
- **Backend:** [Render.com](https://render.com) (FastAPI + ML Models) → `https://insuarance-claim-prediction.onrender.com`
- **Frontend:** [Vercel](https://vercel.com) (React + Vite + Tailwind) → `https://insuarance-claim-prediction.vercel.app`

---

## 1. Cloud Database (Supabase PostgreSQL)

1. Sign up / Log in to [Supabase](https://supabase.com/).
2. Create a project in a nearby region (e.g. `South Asia (Mumbai)`).
3. Click **Connect** (top header) → **Direct** or **Session Pooler** (URI mode).
4. Copy the connection string. Important: On Render's free tier, always use the **IPv4 Pooler URL**:
   ```text
   postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Tables `predictions` and `feedback` are automatically created on startup.

---

## 2. Backend Deployment (Render)

1. Go to [dashboard.render.com](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect your repository.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
4. Environment Variables:
   - `DATABASE_URL`: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
   - `PYTHON_VERSION`: `3.11.9` (optional)
5. Live Swagger API Docs: `https://insuarance-claim-prediction.onrender.com/docs`

---

## 3. Frontend Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com/) → **Add New…** → **Project**.
2. Import your GitHub repository (or fork).
3. Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Environment Variable:**
     - `VITE_API_URL`: `https://insuarance-claim-prediction.onrender.com`
4. Live Application URL: `https://insuarance-claim-prediction.vercel.app`

---

## 4. Local Development

- **Local Backend:**
  ```bash
  cd backend
  pip install -r requirements.txt
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Local Frontend:**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- **Or via Docker Compose:**
  ```bash
  docker compose up --build
  ```
