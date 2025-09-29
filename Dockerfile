# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends xdelta3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml README.md backend.txt frontend.txt tests.txt /app/
COPY src /app/src
COPY tests /app/tests
COPY releases /app/releases

RUN pip install --upgrade pip \
    && pip install .[server]

EXPOSE 8000

ENV DGCOMM_CACHE_DIR=/tmp/dgcommander-cache

CMD ["gunicorn", "-b", "0.0.0.0:8000", "dgcommander.app:create_app()", "--worker-class", "gthread", "--threads", "4"]
