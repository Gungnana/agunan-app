# Bali Land Market Search

A React/Vite frontend searches publicly indexed Bali land listings using Brave Search. A FastAPI backend resolves coordinates, searches listing pages, and optionally enriches public listing details. MySQL stores the existing application data.

## Local Docker

1. Copy `.env.example` to `.env`.
2. Set unique values for `SECRET_KEY`, database passwords, and initial account passwords. Set `BRAVE_SEARCH_API_KEY` to enable web search.
3. Run `docker compose up --build -d` from the repository root.
4. Open `http://localhost`.

Never commit `.env`. Use unique production credentials; do not deploy the sample values from `.env.example`.

## Hosting

Vercel hosts the static frontend only. The FastAPI backend and MySQL database require separate hosting; Docker Compose is not run by Vercel.

### Frontend on Vercel

1. Import this repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Use the Vite defaults: build command `npm run build`, output directory `dist`.
4. Add the environment variable `VITE_API_BASE_URL` with the public backend URL ending in `/api/v1`, for example `https://your-api.example.com/api/v1`.
5. Redeploy after changing environment variables.

The `frontend/vercel.json` file provides SPA route fallback.

### Backend and database

Deploy `backend/Dockerfile` on a container host that supports persistent services, and provision a managed MySQL 8 database. Configure these environment variables on the backend service:

- `APP_ENV=production`
- `DATABASE_URL` for the managed MySQL database
- `SECRET_KEY` as a unique random value of at least 32 characters
- `CORS_ORIGINS` including the exact Vercel production domain (and preview domains only if needed)
- `INITIAL_ADMIN_PASSWORD` and `INITIAL_ANALIS_PASSWORD` as unique credentials
- `BRAVE_SEARCH_API_KEY`

Do not expose backend secrets as `VITE_*` variables; Vite variables are bundled into browser assets. The backend's `/health` route can be used for a health check.

The repository does not currently include a Vercel deployment token, GitHub remote, or configured CLI authentication. Create/connect the GitHub repository and authorize Vercel in their respective dashboards to complete hosted deployment.
