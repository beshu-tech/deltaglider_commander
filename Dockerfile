# syntax=docker/dockerfile:1
# DeltaGlider Commander Docker Image
#
# Required environment variables (must be provided at runtime):
#   DGCOMM_HMAC_SECRET - Secret for signing download tokens (required)
# Optional environment variables:
#   DGCOMM_LOG_LEVEL - Logging verbosity: DEBUG, INFO, WARNING, ERROR (default: INFO)
#   DGCOMM_PURGE_INTERVAL_HOURS - Hours between purge runs (default: 1)
#   CACHE_ENABLED - Set to "false" to bypass in-process caches during debugging
#
# Housekeeping job credentials (optional, falls back to main credentials if not set):
#   DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY - AWS access key for purge job
#   DGCOMM_HOUSEKEEPING_S3_SECRET_KEY - AWS secret key for purge job
#   DGCOMM_HOUSEKEEPING_S3_ENDPOINT - S3 endpoint for purge job
#   DGCOMM_HOUSEKEEPING_S3_REGION - AWS region for purge job
#   DGCOMM_HOUSEKEEPING_S3_SESSION_TOKEN - AWS session token for purge job (optional)
#   DGCOMM_HOUSEKEEPING_S3_ADDRESSING_STYLE - S3 addressing style (default: path)
#   DGCOMM_HOUSEKEEPING_S3_VERIFY_SSL - Verify SSL certificates (default: true)
#
# S3/AWS credentials are configured through the web UI at runtime,
# not via environment variables. See /settings in the application.
#
# Example run command:
#   docker run -p 8000:8000 \
#     -e DGCOMM_HMAC_SECRET=your-hmac-secret \
#     -e DGCOMM_LOG_LEVEL=WARNING \
#     beshultd/deltaglider_commander

# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

# Copy frontend package files
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/

# Copy vite config to ensure correct build output
COPY frontend/vite.config.ts ./frontend/

# Install dependencies
RUN cd frontend && pnpm install --frozen-lockfile

# Copy full project structure (needed for vite.config.ts outDir path)
COPY src/ ./src/
COPY frontend/ ./frontend/

# Build frontend (outputs to /build/src/dgcommander/static per vite.config.ts)
RUN cd frontend && pnpm build

# Stage 2: Build Python backend
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends xdelta3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml README.md /app/
COPY src /app/src

# Copy built frontend from previous stage (vite outputs to /build/src/dgcommander/static)
COPY --from=frontend-builder /build/src/dgcommander/static /app/src/dgcommander/static

RUN pip install --upgrade pip \
    && pip install .[server]

EXPOSE 8000

# Security - MUST be provided at runtime for production
ENV DGCOMM_HMAC_SECRET=""

# Application defaults
ENV DGCOMM_LOG_LEVEL="INFO"
ENV DGCOMM_CACHE_DIR="/tmp/dgcommander-cache"
ENV DGCOMM_OBJECT_RATE_LIMIT="10"
ENV DGCOMM_OBJECT_RATE_WINDOW="1.0"
ENV DGCOMM_DOWNLOAD_TTL="300"
ENV DGCOMM_PURGE_INTERVAL_HOURS="6"
ENV CACHE_ENABLED="true"

# Housekeeping job defaults (empty = use main credentials or none)
ENV DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY=""
ENV DGCOMM_HOUSEKEEPING_S3_SECRET_KEY=""
ENV DGCOMM_HOUSEKEEPING_S3_ENDPOINT=""
ENV DGCOMM_HOUSEKEEPING_S3_REGION=""
ENV DGCOMM_HOUSEKEEPING_S3_SESSION_TOKEN=""
ENV DGCOMM_HOUSEKEEPING_S3_ADDRESSING_STYLE="path"
ENV DGCOMM_HOUSEKEEPING_S3_VERIFY_SSL="true"

# Run with 4 worker processes
# The filesystem-based purge scheduler lock ensures only one worker runs the scheduler
CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "4", "dgcommander.app:create_app()"]
