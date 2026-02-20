# Deployment Guide

This guide will help you deploy your **CodeSync** application (MERN Stack) online.

We will use **Render.com** (it's free and easy) for the backend and **Vercel** for the frontend.

---

## Part 1: Backend Deployment (Render)

1.  **Push your code to GitHub**
    *   Make sure your project is in a GitHub repository.

2.  **Create a Web Service on Render**
    *   Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
    *   **Root Directory**: `backend` (Important! Since your backend code is in the `backend` folder).
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
    *   **Environment Variables** (Add these in the "Environment" tab):
        *   `MONGODB_URI`: Your MongoDB Connection String.
        *   `FRONTEND_URL`: `https://your-frontend-project.vercel.app` (You can add this *after* deploying frontend, or set it to `*` temporarily).
        *   `PORT`: `5000` (Render sets this automatically, but good to check).

3.  **Deploy**
    *   Click **Create Web Service**. Render will start building.
    *   Once done, copy your **Backend URL** (e.g., `https://code-sync-backend.onrender.com`).

---

## Part 2: Frontend Deployment (Vercel)

1.  **Create a New Project on Vercel**
    *   Go to [vercel.com](https://vercel.com/) and click **Add New** -> **Project**.
    *   Import the same GitHub repository.

2.  **Configure Project**
    *   **Root Directory**: Click "Edit" and select `frontend`.
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Environment Variables**:
        *   `VITE_API_URL`: Paste your **Render Backend URL** here (e.g., `https://code-sync-backend.onrender.com`).
            *   *Note: Do NOT add a trailing slash `/` at the end.*

3.  **Deploy**
    *   Click **Deploy**.

---

## Part 3: Final Connection

1.  **Update Backend CORS**
    *   Go back to **Render Dashboard** -> Your Web Service -> **Environment**.
    *   Update `FRONTEND_URL` to match your actual Vercel URL (e.g., `https://code-sync-frontend.vercel.app`).
    *   Render will re-deploy automatically.

2.  **Verify Firebase Auth**
    *   Go to **Firebase Console** -> Authentication -> Settings -> **Authorized Domains**.
    *   Add your **Vercel domain** (e.g., `code-sync-frontend.vercel.app`) to the list.

## 🎉 Done!
Your CodeSync app is now live!
