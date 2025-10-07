# syntax=docker/dockerfile:1
# DeltaGlider Commander Docker Image
#
# Required environment variables (must be provided at runtime):
#   DGCOMM_HMAC_SECRET - Secret for signing download tokens (required)
#
# S3/AWS credentials are configured through the web UI at runtime,
# not via environment variables. See /settings in the application.
#
# Example run command:
#   docker run -p 8000:8000 \
#     -e DGCOMM_HMAC_SECRET=your-hmac-secret \
#     beshultd/deltaglider_commander

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends xdelta3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml README.md /app/
COPY src /app/src
COPY frontend/dist /app/src/dgcommander/static

RUN pip install --upgrade pip \
    && pip install .[server]

EXPOSE 8000

# Security - MUST be provided at runtime for production
ENV DGCOMM_HMAC_SECRET=""

# Application defaults
ENV DGCOMM_CACHE_DIR="/tmp/dgcommander-cache"
ENV DGCOMM_OBJECT_RATE_LIMIT="10"
ENV DGCOMM_OBJECT_RATE_WINDOW="1.0"
ENV DGCOMM_DOWNLOAD_TTL="300"

CMD ["gunicorn", "-b", "0.0.0.0:8000", "dgcommander.app:create_app()", "--worker-class", "gthread", "--threads", "4"]
