# Energy-Meter-

Modern, responsive **Smart Energy Meter Dashboard** (ESP32 + Blynk) built with **React + Vite + Tailwind + Recharts**.

## Setup

1. Install deps:

```bash
npm install
```

2. Add your Blynk token in `.env`:

```env
VITE_BLYNK_TOKEN=your_blynk_token_here
```

3. Run locally:

```bash
npm run dev
```

## Deploy (Vercel)

- Import the repo in Vercel
- Set environment variable `VITE_BLYNK_TOKEN`
- Build command: `npm run build`
- Output: `dist`

# Deploy (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables:
  - `BLYNK_TOKEN` (recommended) or `VITE_BLYNK_TOKEN`

This repo includes:
- `netlify/functions/blynk.js` (serverless API)
- `netlify.toml` redirect so the app can call `/api/blynk`

### If `/api/blynk` returns 500 on Netlify

1. Open **Netlify → Site → Site configuration → Environment variables**.
2. Add **`BLYNK_TOKEN`** (recommended) with your Blynk auth token value.
3. Scope: **Production** (and **Deploy previews** if you use them).
4. **Trigger redeploy** (Deploys → Trigger deploy → Clear cache and deploy site).

Without this, the serverless function has no token and returns HTTP 500.

**Workaround (already in code):** If you set **`VITE_BLYNK_TOKEN`** in Netlify **build** environment variables and redeploy, the app will **fall back to calling Blynk directly** from the browser when `/api/blynk` fails. Prefer fixing **`BLYNK_TOKEN`** for the function so the token is not visible in the client bundle/network.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
