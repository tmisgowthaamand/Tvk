# 🚀 TVK Voter Support System - Deployment Guide

This guide explains how to deploy the **TVK Voter Support System** to production using **Render** (Backend) and **Vercel** (Frontend).

---

## 🏗️ 1. Backend Deployment (Render)

The root folder contains the Node.js server and WhatsApp bot.

1.  **Push your code** to a GitHub repository.
2.  Create a new **Web Service** on [Render](https://render.com/).
3.  Connect your GitHub repository.
4.  **Settings:**
    -   **Environment:** `Node`
    -   **Build Command:** `npm install`
    -   **Start Command:** `npm start`
5.  **Environment Variables:**
    -   `NODE_ENV`: `production`
    -   `MONGO_URI_VOTERS`: (Your MongoDB URL for voter_db)
    -   `MONGO_DB_VOTERS`: `voter_db`
    -   `MONGO_URI_MEMBERS`: (Your MongoDB URL for member_db)
    -   `MONGO_DB_MEMBERS`: `member_db`
    -   `WHATSAPP_PHONE_NUMBER_ID`: (From Meta Developer Portal)
    -   `WHATSAPP_API_TOKEN`: (Permanent Token from Meta)
    -   `WHATSAPP_VERIFY_TOKEN`: (Your secret token, e.g., `tvk_verify_2026`)
    -   `WHATSAPP_WEBHOOK_URL`: `https://your-backend-url.onrender.com/api/webhook/whatsapp`

---

## 🎨 2. Frontend Deployment (Vercel)

The `client` folder contains the React/Vite dashboard.

1.  In the [Vercel](https://vercel.com/) dashboard, click **Add New** > **Project**.
2.  Connect your GitHub repository.
3.  **Project Settings:**
    -   **Framework Preset:** `Vite`
    -   **Root Directory:** `client` (Very Important! Click Edit and select the `client` folder)
    -   **Build Command:** `npm run build`
    -   **Output Directory:** `dist`
4.  **Environment Variables:**
    -   `VITE_API_URL`: `https://your-backend-url.onrender.com` (Your Render dashboard URL)

---

## 📡 3. Update WhatsApp Webhook

Once the backend is live on Render:
1.  Go to **Meta Developer Portal** > **WhatsApp** > **Configuration**.
2.  Set **Callback URL** to: `https://your-backend-url.onrender.com/api/webhook/whatsapp`
3.  Set **Verify Token** to your `WHATSAPP_VERIFY_TOKEN`.
4.  Subscribe to `messages` under **Webhooks Fields**.

---

## 🏠 4. Local Development

To run locally, you can continue using:
-   **Backend:** `node server.js` (Root)
-   **Frontend:** `npm run dev` (Inside `client`)

_Note: For the local frontend to talk to the local backend, ensure `VITE_API_URL` is NOT set in `client/.env` (it will default to `/api` which Vite proxies via `vite.config.js`)._
