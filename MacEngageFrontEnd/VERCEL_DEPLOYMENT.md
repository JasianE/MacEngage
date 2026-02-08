# MacEngage Frontend Deployment on Vercel (Free)

This guide is intentionally very detailed and beginner-friendly.

---

## 0) What you are deploying

- **Frontend app**: `MacEngageFrontEnd/` (React + Vite)
- **Backend API**: Firebase Cloud Functions (already hosted)
- **Goal**: host frontend on Vercel free tier and keep API calls working

---

## 1) Prerequisites

Make sure you have:

1. A GitHub account
2. A Vercel account (you can sign in with GitHub)
3. This repository pushed to GitHub
4. Backend API deployed (current default):

```text
https://us-central1-macengage2026.cloudfunctions.net/api
```

---

## 2) Project files already prepared for Vercel

The frontend is now configured to use:

1. Environment variable API base URL:
   - `VITE_API_BASE_URL`
2. SPA rewrite config for React Router:
   - `vercel.json`
3. Env template file:
   - `.env.example`

---

## 3) Local pre-check (recommended)

From the repository root, run:

```bash
npm --prefix MacEngageFrontEnd install
npm --prefix MacEngageFrontEnd run build
```

If `build` completes successfully, Vercel should be able to build it too.

---

## 4) Create Vercel project

1. Go to: https://vercel.com
2. Click **Add New...** → **Project**
3. Import repo: `JasianE/MacEngage`
4. In project setup, set **Root Directory** to:

```text
MacEngageFrontEnd
```

5. Confirm build settings (usually auto-detected):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

---

## 5) Add environment variable in Vercel

In Vercel project settings (during setup or after):

1. Open **Environment Variables**
2. Add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://us-central1-macengage2026.cloudfunctions.net/api`
3. Apply to:
   - Production (required)
   - Preview (recommended)

Then deploy.

---

## 6) Verify deployment

After deployment is complete:

1. Open your Vercel URL
2. Confirm landing page loads
3. Navigate directly to `/login` and refresh
   - Should still load (proves SPA rewrite works)
4. Test sign-up/login
5. Open dashboard/live session pages
6. In browser DevTools → Network, confirm API calls go to your Firebase Functions URL

---

## 7) Common issues and fixes

### Issue A: 404 on page refresh for `/dashboard` or `/login`
- Cause: missing SPA rewrite
- Fix: keep `vercel.json` in `MacEngageFrontEnd/`

### Issue B: API calls failing after deploy
- Cause: missing or incorrect `VITE_API_BASE_URL`
- Fix: correct environment variable in Vercel and redeploy

### Issue C: Wrong folder deployed
- Cause: Vercel root directory set to repo root
- Fix: set root directory to `MacEngageFrontEnd`

---

## 8) Ongoing workflow

1. Commit and push changes to GitHub
2. Vercel auto-deploys on push
3. Use Preview deployments for branch testing
4. Merge to main for production deployment
