# Production image. docker-compose overrides the command with --reload for
# local development, so the dev convenience lives there rather than here —
# a hot-reloading watcher in a deployed container is a stability and
# performance problem, not a feature.
FROM python:3.12-slim

WORKDIR /app

# gcc and libpq-dev are only needed while pip builds wheels; dropping them
# afterwards keeps the deployed image smaller and its attack surface
# narrower than the build environment that produced it.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc \
    && rm -rf /var/lib/apt/lists/*

COPY ./app ./app
COPY ./scripts ./scripts

# Uploaded documents live here. On Render this is ephemeral unless a disk
# is attached — see DEPLOYMENT.md, which says so plainly rather than
# letting the first lost upload be the discovery.
RUN mkdir -p /app/uploads

# Render supplies PORT and expects the process to bind it. The default
# keeps `docker run` working locally without one set.
ENV PORT=8000
EXPOSE 8000

# Shell form on purpose: $PORT has to be expanded at runtime, and exec form
# would pass the literal string "$PORT" to uvicorn.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
