# dgcommander

DeltaGlider UI backend service implemented in Flask. Provides a REST API for browsing buckets and objects managed by the DeltaGlider SDK and exposes pre-built frontend assets.

## Getting started

Create a virtual environment, install dependencies, and run the automated tests:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
pytest
```

## Local MinIO stack

Use Docker Compose to bring up MinIO and the backend wired to the real DeltaGlider SDK:

```bash
docker compose up --build minio backend
```

Seed the bucket with sample release artifacts (optional but recommended for UI testing):

```bash
docker compose run --rm --build seed
```

The API is available at `http://localhost:8000/api` and the MinIO console at `http://localhost:9001` (credentials `deltadmin` / `deltasecret`).
