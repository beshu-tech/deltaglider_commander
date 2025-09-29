# syntax=docker/dockerfile:1
# DeltaGlider Commander Docker Image
#
# Required environment variables (must be provided at runtime):
#   AWS_ACCESS_KEY_ID - S3 access key
#   AWS_SECRET_ACCESS_KEY - S3 secret key
#   DGCOMM_S3_ENDPOINT - S3 endpoint URL (e.g., https://s3.amazonaws.com)
#   DGCOMM_HMAC_SECRET - Secret for signing download tokens
#
# Example run command:
#   docker run -p 8000:8000 \
#     -e AWS_ACCESS_KEY_ID=your-key \
#     -e AWS_SECRET_ACCESS_KEY=your-secret \
#     -e DGCOMM_S3_ENDPOINT=https://s3.amazonaws.com \
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

# S3 configuration - these MUST be provided at runtime
ENV AWS_ACCESS_KEY_ID=""
ENV AWS_SECRET_ACCESS_KEY=""
ENV AWS_DEFAULT_REGION="us-east-1"
ENV DGCOMM_S3_ENDPOINT=""
ENV DGCOMM_S3_ADDRESSING_STYLE="path"
ENV DGCOMM_S3_VERIFY_SSL="true"

# Security - MUST be provided at runtime for production
ENV DGCOMM_HMAC_SECRET=""

# Application defaults
ENV DGCOMM_CACHE_DIR="/tmp/dgcommander-cache"
ENV DGCOMM_OBJECT_RATE_LIMIT="10"
ENV DGCOMM_OBJECT_RATE_WINDOW="1.0"
ENV DGCOMM_DOWNLOAD_TTL="300"

CMD ["gunicorn", "-b", "0.0.0.0:8000", "dgcommander.app:create_app()", "--worker-class", "gthread", "--threads", "4"]
