# InsureSight Deployment Guide (Render + Vercel)

This project has been updated with a **persistent SQLite database** and configured for cloud deployment:
- **Backend:** [Render.com](https://render.com) (FastAPI + SQLite + ML Models)
- **Frontend:** [Vercel](https://vercel.com) (React + Vite + Tailwind)

---

## 1. Push Your Code to GitHub

If you haven't already, push all latest files to your GitHub repository:

```bash
git add .
git commit -m "feat: add SQLite database, history logs, and deployment configurations"
git push origin main
```

---

## 2. Deploy Backend to Render (Free)

1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in.
2. Click **New +** → **Web Service**.
3. Select your GitHub repository (`CLAIM-PREDICTION-SEM-7`).
4. Configure the service settings:
   - **Name:** `insuresight-backend` (or any name you prefer)
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Click **Create Web Service**.
6. Render will build the service, train the models from `data/insurance.csv`, and start FastAPI.
7. Once finished, copy your Render URL:  
   👉 `https://insuresight-backend.onrender.com`

> **Note on Database Persistence:** Render free instances spin down when inactive. If you want permanent disk persistence for your SQLite database across restarts on Render, attach a free/low-cost Persistent Disk to the `/app/data` mount path in the Render dashboard (Disks tab).

---

## 3. Deploy Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com/) and log in.
2. Click **Add New…** → **Project**.
3. Import your GitHub repository (`CLAIM-PREDICTION-SEM-7`).
4. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** click `Edit` and select `frontend`
5. Open the **Environment Variables** section and add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-name.onrender.com` *(paste your Render backend URL from step 2, no trailing slash)*
6. Click **Deploy**.
7. In ~60 seconds, your application will be live at `https://your-app.vercel.app`!

---

## 4. Local Testing with Docker (Optional)

You can also run both frontend and backend locally with Docker:

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs`
- SQLite Database: stored persistently in `backend/data/insuresight.db`
