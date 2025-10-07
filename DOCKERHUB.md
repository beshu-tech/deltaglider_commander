# DeltaGlider Commander

A high-performance S3 object browser and manager with delta compression capabilities, powered by the [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider).

## Overview

DeltaGlider Commander provides a modern web interface for browsing and managing objects in S3-compatible storage systems. It leverages delta compression to optimize storage and transfer efficiency, making it ideal for managing large datasets with incremental changes.

### Key Features

- 🚀 **Delta Compression** - Automatic delta compression for efficient storage and bandwidth usage (99%+ compression for archives)
- 📦 **S3 Compatible** - Works with AWS S3, MinIO, and other S3-compatible storage
- 🔒 **Secure Downloads** - Time-limited, signed download URLs with HMAC authentication
- 🎨 **Modern UI** - React-based interface with TypeScript and real-time updates
- ⚡ **High Performance** - Optimized metadata retrieval and quick-mode listing for large datasets
- 🔧 **REST API** - Comprehensive Flask API with rate limiting
- 🛡️ **Security Hardened** - Bandit scanning, secure temp handling, quality gates in CI/CD
- 🐳 **Production Ready** - Multi-stage Docker builds with automated testing

## Quick Start

### Latest Version (Recommended)

```bash
docker run -d -p 8000:8000 \
  -e DGCOMM_HMAC_SECRET=beshutech \
  beshultd/deltaglider_commander:latest
```

### Specific Version

```bash
docker run -d -p 8000:8000 \
  -e DGCOMM_HMAC_SECRET=beshutech \
  beshultd/deltaglider_commander:1.0.3
```

Access the web UI at `http://localhost:8000` and navigate to Settings to configure your S3/AWS credentials.

**Note**: S3 credentials are now configured through the web UI at runtime, not via environment variables. Your credentials are stored securely in your browser's session storage.

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DGCOMM_HMAC_SECRET` | Secret for signing download tokens | Generate with `openssl rand -hex 32` |

### S3/AWS Credentials

**S3 credentials are configured through the web UI, not environment variables.** After starting the container:

1. Navigate to `http://localhost:8000/settings`
2. Enter your S3 credentials:
   - Access Key ID
   - Secret Access Key
   - Region (e.g., `us-east-1`)
   - Endpoint (leave empty for AWS S3, or specify custom endpoint like `https://minio.example.com`)
   - Addressing Style (`path` or `virtual`)

Your credentials are stored securely in your browser's session storage and are never persisted on the server.

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DGCOMM_CACHE_DIR` | Directory for delta cache | System temp dir + `/dgcommander-cache` |
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
      DGCOMM_HMAC_SECRET: ${DGCOMM_HMAC_SECRET}
      # Optional: Configure cache directory
      # DGCOMM_CACHE_DIR: /tmp/dgcommander-cache
```

Then configure your S3 credentials through the web UI at `http://localhost:8000/settings`.

## MinIO and S3-Compatible Storage

DeltaGlider Commander works with MinIO and other S3-compatible storage services. After starting the container, configure your credentials through the web UI:

- **Endpoint**: Custom endpoint URL (e.g., `http://minio:9000` or `https://minio.example.com`)
- **Access Key ID**: Your MinIO/S3-compatible access key
- **Secret Access Key**: Your MinIO/S3-compatible secret key
- **Region**: Region name (e.g., `us-east-1` or custom region)
- **Addressing Style**: `path` (recommended for MinIO) or `virtual`
- **Verify SSL**: Disable for self-signed certificates if needed

## Available Tags

- `latest` - Most recent stable release
- `1.0.2`, `1.0` - Latest stable version with runtime API URL detection
- `0.1.8`, `0.1` - Previous stable versions
- Semantic versioning follows `MAJOR.MINOR.PATCH`

## API Endpoints

- `GET /api/buckets` - List all buckets with optional compression stats
- `GET /api/buckets/{bucket}/objects` - List objects with metadata (supports quick mode)
- `GET /api/buckets/{bucket}/objects/{key}/metadata` - Get object metadata
- `GET /api/buckets/{bucket}/objects/{key}/download` - Get HMAC-signed download URL
- `POST /api/buckets/{bucket}/objects` - Upload object (with automatic delta compression)
- `DELETE /api/buckets/{bucket}/objects/{key}` - Delete object

## Security Notes

- Always use a strong, unique `DGCOMM_HMAC_SECRET` in production (generate with `openssl rand -hex 32`)
- The HMAC secret is used to sign time-limited download tokens (default TTL: 5 minutes)
- S3 credentials are stored in browser session storage, not on the server
- Credentials are passed securely via HTTP-only session cookies
- Session credentials are never persisted to disk on the backend
- All temporary files use secure system temp directories
- Security scanning with Bandit is part of the CI/CD pipeline

## What's New in v1.0.3

### Critical Flask Routing Fix
- 🐛 **Fixed API Routing Conflict** - Resolved Flask static file handler intercepting `/api/objects/` requests
- 🔧 **Improved Static File Handling** - Disabled automatic static file handling to prevent API route conflicts
- ✨ **Explicit Asset Routing** - Added dedicated `/assets/` route for serving frontend assets
- 🚀 **SPA Routing Enhancement** - Replaced catch-all route with 404 error handler for proper SPA fallback

### Technical Improvements
- **Root Cause Resolution** - Flask's `static_url_path="/"` was causing all routes to be intercepted by static handler
- **API Blueprint Priority** - Ensures API blueprints are processed before static file handling
- **Better Error Handling** - Proper 404 responses for missing API endpoints vs SPA routes

### Developer Experience
- 🎯 **VSCode Debug Configuration** - Added `launch.json` for easy debugging with breakpoints
- 📝 **Improved Documentation** - Clear explanation of Flask routing architecture

## What's New in v1.0.2

### Smart Runtime Configuration
- 🎯 **Runtime API URL Detection** - Frontend automatically detects localhost:5173 vs production environment
- ✨ **No Build-Time Configuration** - Same build works everywhere, no environment-specific builds needed
- 🚀 **Zero Configuration Deployment** - Build once, deploy anywhere - frontend adapts automatically

### Backend Enhancements
- 🔒 **TEST_MODE Gating** - Container SDK initialization properly gated for test environments only
- ✅ **Fixed SDK Credential Passing** - Proper boto3 client configuration with explicit credentials
- 🧹 **Code Cleanup** - Removed unused imports and Docker environment variables

### Frontend Improvements
- 🧠 **Smart Environment Detection** - Uses `window.location.hostname` and `port` to determine API URL at runtime
- ⚡ **Universal Build** - One build works in development (localhost:5173) and production (any host)
- 🗑️ **Simplified Configuration** - Removed `.env` complexity, minimal `.env.local` for optional overrides

### Documentation
- 📚 **Updated Development Guide** - Clear explanation of runtime detection approach
- 🔍 **Simplified Setup** - No more environment-specific configuration hassles
- 🚀 **Deployment Clarity** - Build once, works everywhere philosophy

## Links

- [GitHub Repository](https://github.com/sscarduzio/dg_commander)
- [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider)
- [Issue Tracker](https://github.com/sscarduzio/dg_commander/issues)
- [Release Notes](https://github.com/sscarduzio/dg_commander/releases)

## License

See the project repository for license information.
