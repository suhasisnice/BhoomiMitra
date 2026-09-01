# Deploying to Supabase + Render

One repository, three moving parts: a Postgres database on Supabase, the
API on Render (`backend/`), and the built frontend on Render as a static
site (`frontend/`).

`render.yaml` at the root defines both services. Render reads it as a
single Blueprint and uses `rootDir` to point each service at its half of
the tree.

Read [Known limitations](#known-limitations) before the demo, not after.

---

## 1. Supabase: the database

1. Create the project. Pick the **Singapore** region — the same one
   `render.yaml` pins for the API.

   Supabase also offers Mumbai (`ap-south-1`), which is closer to the users
   and is still the wrong choice. Render has no India region at all — its
   five are Oregon, Ohio, Virginia, Frankfurt and Singapore — so the API is
   going to sit in Singapore regardless. The question is only where the
   database goes relative to it, and the two hops are not paid at the same
   rate: user-to-API is paid once per page request, API-to-database once
   per *query*, and endpoints like the dashboard KPIs issue several.

   The pooled connection makes that worse rather than better. pgbouncer
   requires `NullPool` (see below), so each request opens a fresh
   connection, and a TLS handshake is several round trips before any SQL
   moves. Across Mumbai↔Singapore that handshake alone costs more than the
   entire India→Singapore hop it was meant to save.

   Co-located, the database hop is effectively free and the distance to
   India is paid exactly once per request. Move both together or neither.

2. **Turn off "Enable Data API"** on the project creation form.

   The app talks to Postgres directly through SQLAlchemy and never calls
   Supabase's generated REST API. Left on — with "Automatically expose new
   tables" on beside it — every table this schema creates is published over
   PostgREST to the `anon` role, and our authorisation lives in FastAPI
   rather than in row-level security, so there is nothing underneath to
   stop it. That would expose `users.password_hash`, the `persons` table,
   `compensation` amounts and the whole `audit_log` to anyone holding the
   project's anon key, which is a public client key by design.

3. **Enable PostGIS before the API ever starts.** Dashboard →
   Database → Extensions → search `postgis` → enable the first entry only.

   This is not optional and it is not something the app can do for itself.
   `Parcel.geom` is a `Geometry(POINT, 4326)`; without the extension the
   type does not exist, `create_all()` fails, and the API dies at boot with
   a type error that reads like a code bug.

   Skip `postgis_tiger_geocoder`, `postgis_raster`, `postgis_topology` and
   `postgis_sfcgal` — nothing here uses them.

   Then confirm the type actually resolves, because GeoAlchemy2 emits an
   unqualified `geometry(POINT,4326)` and PostGIS installs into the
   `extensions` schema. In the SQL editor:

   ```sql
   select 'POINT(0 0)'::geometry is not null as geometry_resolves;
   ```

   `true` means `create_all()` will build `parcels` on first boot. An error
   here means `extensions` is not on the role's `search_path`, and it is
   far cheaper to find that out on this page than inside a deploy log.

4. Copy both connection strings from Connect → ORMs / psycopg2:

   | Connection | Port | Use it for |
   |---|---|---|
   | Transaction pooler | 6543 | The Render service (`DATABASE_URL`) |
   | Direct connection | 5432 | Seeding and psql from your machine |

   The pooled string's user looks like `postgres.<project-ref>`, not plain
   `postgres`. Copy it whole rather than editing the direct one.

Why two: the pooler is pgbouncer, which multiplexes many clients onto few
server connections and breaks anything assuming a session survives between
statements. `backend/app/database.py` detects port 6543 (or a
`pooler.supabase.com` host) and switches to `NullPool` so SQLAlchemy stops
pooling on top of a pooler. The direct connection keeps normal pooling but
allows far fewer concurrent connections — right for a one-off seed run,
wrong for a web service that sleeps and wakes.

SSL is required on both, and is applied by host rather than by port: any
non-local host gets `sslmode=require`.

---

## 2. Push the repository

Render deploys from git, so this has to be on GitHub before anything else
works.

```bash
cd ~/Desktop/projects/BhoomiMitra
git init
git add -A
git commit -m "BhoomiMitra: land acquisition platform, API and frontend"
git branch -M main
git remote add origin https://github.com/suhasisnice/BhoomiMitra.git
git push -u origin main
```

Both `.env` files are gitignored, so no secrets go up. `frontend/.env.production`
is meant to be committed — it holds only the API URL.

---

## 3. Seed the database

Run this **once**, from your machine, against the **direct** (5432) string.

```bash
cd ~/Desktop/projects/BhoomiMitra/backend
docker compose run --rm --no-deps \
  -e DATABASE_URL="postgresql://postgres:PASS@db.PROJECT.supabase.co:5432/postgres" \
  -e SEED_PASSWORD="something-not-in-this-repo" \
  api python -m app.ai_layer.seed --allow-remote
```

`SEED_PASSWORD` is **not optional here, because this repository is public.**
It defaults to `demo1234`, which is printed in
`backend/app/ai_layer/constants.py`. That default is right for a
loopback-only database of synthetic data and completely wrong for one
anyone can reach: without it, every reader of the repo can sign in to the
deployment as `admin`, a State Administrator.

The other two flags:

- `--no-deps` stops compose from starting the local database alongside it;
  without it you boot a Postgres container this command never touches.
- `--allow-remote` is required, and it is a guard rather than ceremony:
  `run_seed()` `TRUNCATE`s every table. It refuses a non-local host unless
  you say so explicitly, so a reflexive re-run cannot silently wipe the
  deployed database.

`run_seed()` calls `create_all()` itself, so this both creates the schema
and fills it. Deploying the API first also works — it creates the same
tables at boot — but the order above means the API's first boot finds a
database that is already right.

Add `--rebuild` only when the models have changed shape since the last
seed; it drops every table first. See [Known limitations](#known-limitations).

The seed writes six accounts sharing whatever password you chose:
`dc.bengaluru`, `slao.bengaluru`, `rnr.bengaluru`, `field.bengaluru`,
`admin`, `landowner`. **The deployed login page does not list them** — see
§5 — so whoever is demonstrating needs both the usernames and that password
from somewhere other than the screen in front of them.

---

## 4. Render: the API

New → Blueprint → point it at the repo. Render reads the root
`render.yaml` and creates **both** services at once. Three variables on the
API are marked `sync: false` and must be filled in the dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The **pooled** string, port **6543** |
| `FRONTEND_ORIGIN` | The static site's URL, e.g. `https://bhoomimitra.onrender.com` |
| `SECRET_KEY` | Leave it — Render generates one and keeps it |

`ENVIRONMENT=production` is set by the blueprint, and it is what arms the
boot guard in `backend/app/config.py`. That guard refuses to start on any
of:

- `SECRET_KEY` still the built-in development value, or under 32 characters
- `FRONTEND_ORIGIN` set to `*`
- `DATABASE_URL` still pointing at the compose host `@db:5432`

It fails loudly at boot rather than serving a quietly insecure API, so a
deploy that dies with `Refusing to start in production…` in the logs is the
guard working — read the message, it names the specific problem.

Chicken-and-egg on `FRONTEND_ORIGIN`: you do not know the static site's URL
until it is created. Deploy with a placeholder, let the frontend come up,
then set the real origin and redeploy the API. Until that is right, every
browser request fails CORS while `curl` keeps working — which is the
signature of exactly this mistake.

---

## 5. Render: the frontend

Created by the same blueprint. Set one variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | The API service's URL, **no trailing slash** |

Vite inlines `VITE_*` at **build** time. Changing this in the dashboard has
no effect until the next deploy — a build made with the wrong value ships a
bundle that calls the wrong host forever, and the fix is always a rebuild,
never a restart.

`VITE_SHOW_DEMO_ACCOUNTS` is deliberately not in the blueprint. The demo
account list renders only when that variable is exactly `"true"`; leaving it
unset is what keeps six working accounts off a public login page.

The blueprint also adds the SPA rewrite (`/*` → `/index.html`). Without it
a browser reload on `/cases/12` 404s, because the app ships one HTML file
and React Router resolves the rest.

---

## 6. Check it

```bash
curl https://sih26016-api.onrender.com/health
# {"api":"ok","database":"ok"}
```

`"database":"unreachable"` alongside a 200 is intentional — a Supabase blip
should surface in the body, not restart the API instance underneath it. But
it means the health check will not catch a database outage for you: read the
body, not just the status code.

Then open the frontend and sign in. If the page loads but sign-in fails
while `/health` is fine, it is `FRONTEND_ORIGIN` (CORS) or `VITE_API_URL`
(built against the wrong host) — in that order of likelihood.

---

## Known limitations

These are known and deliberate, not oversights. Each is something to decide
about rather than something to discover at 2am.

**The repository is public.** That is a choice, and it means the source is
readable by anyone — including `backend/app/ai_layer/constants.py`, which
prints the default seed password, and `frontend/src/pages/Login.jsx`, which
names all six demo usernames. `SEED_PASSWORD` in §3 is what keeps the
deployment from being openable by anyone who reads either file. It is the
single step in this document with no error message to catch it if skipped.

**No migrations.** The app calls `create_all()` at boot, which only ever
*adds* missing tables. It cannot alter a table whose columns changed. So
after a model change the deployed database keeps its old shape, and the
first query against the changed column fails. Today the only way out is
`--rebuild`, which destroys the data. That is acceptable while the data is
generated demo data and stops being acceptable the moment it is not — at
which point this needs Alembic before the next schema change, not after it.

**Uploads are ephemeral.** Documents are written to `/app/uploads` inside
the container. On Render's free plan that filesystem is discarded on every
deploy and every wake-from-sleep, while the `documents` rows still point at
the vanished files — so a download fails with a 404 rather than explaining
itself. Attaching a disk (commented out in `render.yaml`) fixes it and costs
money; moving storage to Supabase Storage fixes it properly and is a code
change. Until one of those, treat an uploaded file as lasting until the
next deploy.

**The free tier sleeps.** After roughly 15 minutes idle the API stops, and
the next request waits out a cold start of about 30–50 seconds.
`pool_recycle=300` keeps it from handing out a connection that died during
the sleep. If this is being judged live, hit `/health` a minute beforehand.

**The login rate limiter is per process.** `backend/app/services/ratelimit.py`
keeps its counters in memory. One instance, one set of counters — correct
here, since the free plan runs exactly one. Scale to two and the effective
limit doubles, and a restart clears every counter. It stops password
guessing at this scale; it is not a distributed limiter and does not claim
to be.

**`backend/docker-compose.yml` has a hardcoded database password.** It is
`sih26016/sih26016`, on a loopback-only port, for the local development
database only. Nothing in the Supabase or Render path reads it. It is not a
deployed credential — those live in the Render dashboard, never in a file.
