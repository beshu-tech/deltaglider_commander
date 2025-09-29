# DeltaGlider Commander

A high-performance S3 object browser and manager with delta compression capabilities, powered by the [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider).

## Overview

DeltaGlider Commander provides a modern web interface for browsing and managing objects in S3-compatible storage systems. It leverages delta compression to optimize storage and transfer efficiency, making it ideal for managing large datasets with incremental changes.

### Key Features

- 🚀 **Delta Compression** - Automatic delta compression for efficient storage and bandwidth usage
- 📦 **S3 Compatible** - Works with AWS S3, MinIO, and other S3-compatible storage
- 🔒 **Secure Downloads** - Time-limited, signed download URLs with HMAC authentication
- 🎨 **Modern UI** - React-based interface with real-time updates
- ⚡ **High Performance** - Built for handling large datasets efficiently
- 🔧 **REST API** - Comprehensive API for integration

## Quick Start

```bash
docker run -p 8000:8000 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e DGCOMM_S3_ENDPOINT=https://s3.amazonaws.com \
  -e DGCOMM_HMAC_SECRET=$(openssl rand -hex 32) \
  beshultd/deltaglider_commander
```

Access the web UI at `http://localhost:8000`

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | S3 access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `DGCOMM_S3_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `DGCOMM_HMAC_SECRET` | Secret for signing download tokens | Generate with `openssl rand -hex 32` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_DEFAULT_REGION` | AWS region | `us-east-1` |
| `DGCOMM_S3_ADDRESSING_STYLE` | `path` or `virtual` | `path` |
| `DGCOMM_S3_VERIFY_SSL` | Verify SSL certificates | `true` |
| `DGCOMM_CACHE_DIR` | Directory for delta cache | `/tmp/dgcommander-cache` |
| `DGCOMM_OBJECT_RATE_LIMIT` | Max requests per window | `10` |
| `DGCOMM_OBJECT_RATE_WINDOW` | Rate limit window (seconds) | `1.0` |
| `DGCOMM_DOWNLOAD_TTL` | Download token lifetime (seconds) | `300` |

## Docker Compose Example

Create a `docker-compose.yml`:

```yaml
version: "3.9"

services:
  dgcommander:
    image: beshultd/deltaglider_commander:latest
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      DGCOMM_S3_ENDPOINT: ${DGCOMM_S3_ENDPOINT}
      DGCOMM_HMAC_SECRET: ${DGCOMM_HMAC_SECRET}
```

## MinIO Configuration

For MinIO or other S3-compatible services:

```bash
docker run -p 8000:8000 \
  -e AWS_ACCESS_KEY_ID=minioadmin \
  -e AWS_SECRET_ACCESS_KEY=minioadmin \
  -e DGCOMM_S3_ENDPOINT=http://minio:9000 \
  -e DGCOMM_S3_ADDRESSING_STYLE=path \
  -e DGCOMM_S3_VERIFY_SSL=false \
  -e DGCOMM_HMAC_SECRET=$(openssl rand -hex 32) \
  beshultd/deltaglider_commander
```

## API Endpoints

- `GET /api/buckets` - List all buckets
- `GET /api/buckets/{bucket}/objects` - List objects in bucket
- `GET /api/buckets/{bucket}/objects/{key}/download` - Get signed download URL
- `POST /api/buckets/{bucket}/objects` - Upload object
- `DELETE /api/buckets/{bucket}/objects/{key}` - Delete object

## Security Notes

- Always use a strong, unique `DGCOMM_HMAC_SECRET` in production
- The HMAC secret is used to sign time-limited download tokens
- Never expose S3 credentials in client-side code
- Consider using IAM roles when running on AWS

## Links

- [GitHub Repository](https://github.com/YOUR_USERNAME/dgcommander)
- [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider)
- [Issue Tracker](https://github.com/YOUR_USERNAME/dgcommander/issues)

## License

See the project repository for license information.
