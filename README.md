# BhoomiMitra

A land acquisition management platform for the RFCTLARR Act, 2013 —
proposal to possession, with the statutory clock visible at every stage.
Built for Smart India Hackathon 2026 (problem SIH26016) as a team; the shared
team repository is
[shreyasreddycs6607-wq/sih26016](https://github.com/shreyasreddycs6607-wq/sih26016).
This repository is my cleaned-up copy of the backend and frontend.

## What it does

- **Case tracking.** Proposals, cases, land parcels, landowners, notices,
  objections, documents and compensation awards, each moving through the
  stages the Act defines. Includes a map view of parcels.
- **Rules engine (the "AI layer", `backend/app/ai_layer`).** Six rules scan
  every case and raise alerts: case stalled, required document missing,
  objection unanswered, award unpaid, possession taken before resettlement,
  and statutory timeline breached. Rules are pure functions, so the same
  data always gives the same alerts.
- **Delay forecast.** `predict.py` projects when each case will finish and how
  likely it is to slip, from how long past cases actually took at each stage
  (a simple statistical model, not a neural network).
- **Dashboard KPIs.** Seven families of figures: area, compensation, families,
  resettlement (R&R), possession, notices and timeline adherence.
- **Access control.** Seven roles (ministry, state, district, field and R&R
  officers, admin, landowner) with district scoping, invite-code sign-up,
  an audit trail, CSV exports, and a server-side guard that blocks
  compensation overpayments.

```
backend/    FastAPI + SQLAlchemy + PostGIS. The API, the rule engine, the seed.
frontend/   React + Vite. Every screen, live against that API.
render.yaml One Render blueprint defining both services.
```

## Running it locally

```bash
cd backend
docker compose up --build          # API on :8000, Postgres on :5433
docker compose exec api python -m app.ai_layer.seed
```

```bash
cd frontend
cp .env.example .env               # points at http://localhost:8000
npm install && npm run dev         # :5173
```

Six demo accounts are seeded, sharing the password `demo1234` unless
`SEED_PASSWORD` says otherwise. The sign-in screen lists them only when
`VITE_SHOW_DEMO_ACCOUNTS=true`, which `.env.example` sets and no deployment
should.

## Checking it

```bash
cd backend
docker compose exec api python scripts/verify_integration.py   # rules and KPIs, in-process
python scripts/verify_build.py                                 # every route, over HTTP
```

Run `verify_integration.py` on a fresh seed. It measures exact anomaly
counts, and `verify_build.py` writes to the database as it goes — it
sanctions a proposal, which mints a real case — so running them the other
way round makes the counts disagree. The script says so when it detects it
rather than reporting a mismatch that looks like a broken rule.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md). Supabase for Postgres, Render for both
services, and a handful of steps whose failure modes are non-obvious —
PostGIS before first boot, the pooled vs direct connection string, and
`SEED_PASSWORD`, which is the one step this public repository makes
mandatory.
