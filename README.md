# DeltaGlider Commander

![DeltaGlider Commander UI](dg_screenshot.png)

S3 browser with delta compression through [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider).

## What It Does

- **Delta compression** - Can reduce storage for similar files (archives, backups)
- **Secure downloads** - Uses S3 presigned URLs instead of embedding credentials
- **Auto-decompression** - Compressed files are transparently decompressed when downloaded
- **Background cleanup** - Temporary files are cleaned up automatically
- **S3 compatible** - Works with AWS S3, MinIO, and other S3 stores

## Quick Start

```bash
docker run -d -p 8000:8000 \
  -e DGCOMM_HMAC_SECRET=$(openssl rand -hex 32) \
  beshultd/deltaglider_commander:latest
```

Then open http://localhost:8000 and configure your S3 credentials.

## Key Features

### Security
- Downloads use S3 presigned URLs (no embedded credentials)
- Background jobs can use separate IAM with limited permissions
- S3 credentials stored in browser session only

### Performance
- Delta compression for similar files (effectiveness varies)
- Multi-worker deployment (4 processes by default)
- Automatic cleanup of temporary files

## Development

```bash
# Run with Docker Compose (includes MinIO)
docker compose up --build

# Or run locally
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
DGCOMM_HMAC_SECRET=dev flask --app src/dgcommander/app.py run

# Frontend (separate terminal)
cd frontend && pnpm install && pnpm dev
```

Visit http://localhost:5173

## Configuration

### Required
- `DGCOMM_HMAC_SECRET` - Generate with `openssl rand -hex 32`

### Optional Housekeeping Credentials
For enhanced security, use separate IAM credentials for background cleanup:
- `DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY` + `DGCOMM_HOUSEKEEPING_S3_SECRET_KEY`
- Minimal IAM policy: List buckets + Delete objects in `.deltaglider/tmp/*`

S3 credentials for normal operations are configured via the web UI.

## How Downloads Work

1. Click download → Generates S3 presigned URL (24h or 1 week expiry)
2. If file is compressed → Gets decompressed to temporary location first
3. Background job cleans up temporary files periodically

Manual cleanup available: `deltaglider purge`

## Docker Deployment

Docker images available at: `beshultd/deltaglider_commander`

```bash
docker run -d -p 8000:8000 \
  -e DGCOMM_HMAC_SECRET=$(openssl rand -hex 32) \
  -e DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY=limited-access-key \
  -e DGCOMM_HOUSEKEEPING_S3_SECRET_KEY=limited-secret-key \
  beshultd/deltaglider_commander:latest
```


---

**Built on**: [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider)  
**Docker Hub**: [beshultd/deltaglider_commander](https://hub.docker.com/r/beshultd/deltaglider_commander)
