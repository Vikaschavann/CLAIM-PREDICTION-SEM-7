# InsureSight Deployment & Setup Guide

This project is configured for:
- **Cloud Database:** [Supabase](https://supabase.com) (PostgreSQL) with automatic local SQLite fallback
- **Backend:** [Render.com](https://render.com) (FastAPI + ML Models)
- **Frontend:** [Vercel](https://vercel.com) (React + Vite + Tailwind)

---

## 1. Fix Git Push Authentication & Push Code

GitHub disabled regular password authentication for git operations. You must use a **Personal Access Token (PAT)** or **GitHub CLI**:

### Option A: Using a GitHub Personal Access Token (PAT) — Recommended
1. Go to your GitHub account: **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**  
   (Direct link: https://github.com/settings/tokens)
2. Click **Generate new token (classic)**.
3. Name it (e.g., `insuresight-token`), set expiration, and check the **`repo`** scope.
4. Copy the generated token (starts with `ghp_...`).
5. Run the push command pointing to `master`:
   ```bash
   git push https://<YOUR_GITHUB_USERNAME>:<YOUR_TOKEN>@github.com/Vikaschavann/CLAIM-PREDICTION-SEM-7.git master
   ```
   *(Replace `<YOUR_GITHUB_USERNAME>` and `<YOUR_TOKEN>` with your actual GitHub username and the copied token)*

### Option B: Using GitHub CLI (Easiest if installed)
```bash
gh auth login
git push origin master
```

---

## 2. Set Up Supabase (Free Cloud PostgreSQL Database)

1. Sign up / Log in to [Supabase](https://supabase.com/).
2. Click **New Project** and choose a project name and database password.
3. Once the project is provisioned, go to **Project Settings** (gear icon) → **Database**.
4. Scroll to **Connection string** → click the **URI** tab.
5. Copy the connection string. It looks like:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
   *(Replace `[YOUR-PASSWORD]` with your project's database password)*

---

## 3. Deploy Backend to Render (Free)

1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in.
2. Click **New +** → **Web Service**.
3. Select your GitHub repository (`CLAIM-PREDICTION-SEM-7`).
4. Configure settings:
   - **Name:** `insuresight-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   - **Key:** `DATABASE_URL`
   - **Value:** `[Paste your Supabase URI from Step 2]`
6. Click **Create Web Service**.
7. Once finished, copy your Render URL:  
   👉 `https://insuresight-backend.onrender.com`

---

## 4. Deploy Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com/) and log in.
2. Click **Add New…** → **Project**.
3. Import your GitHub repository (`CLAIM-PREDICTION-SEM-7`).
4. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** click `Edit` and select `frontend`
5. In **Environment Variables**:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-name.onrender.com` *(from Render, no trailing slash)*
6. Click **Deploy**.
7. Your app is live in ~60 seconds!
