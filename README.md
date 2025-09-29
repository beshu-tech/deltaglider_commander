# DeltaGlider Commander

DeltaGlider Commander is a Flask-based backend service with a React frontend that provides a REST API for browsing and managing objects in S3 buckets through the [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider). The application focuses on delta compression and storage optimization.

## Features

- **S3 Object Management**: Browse, download, and upload objects in S3-compatible storage
- **Delta Compression**: Leverages DeltaGlider SDK for efficient storage and transfer
- **Modern Web UI**: React-based frontend with TypeScript and Vite
- **RESTful API**: Comprehensive Flask API with authentication and rate limiting
- **Docker Support**: Containerized development environment with MinIO

## Architecture

### Backend (Python/Flask)
- **Layered Architecture**: Clear separation between API, service, and data layers
- **DeltaGlider Integration**: Abstract protocol with S3 and in-memory implementations
- **Dependency Injection**: Centralized configuration and service management
- **HMAC Authentication**: Secure download URLs with time-based tokens

### Frontend (React/TypeScript)
- **Modern Tooling**: Vite, TanStack Router, TanStack Query
- **Type Safety**: Full TypeScript implementation
- **Component Architecture**: Feature-based organization with reusable UI components

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- Docker and Docker Compose (for local development)

### Backend Development

Create a virtual environment, install dependencies, and run tests:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
pytest
```

### Frontend Development

```bash
cd frontend
pnpm install
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Build for production
pnpm typecheck    # TypeScript type checking
pnpm lint         # Run ESLint
```

### Local Development with Docker

Use Docker Compose to bring up MinIO and the backend:

```bash
docker compose up --build minio backend
```

Seed the bucket with sample release artifacts (optional but recommended for UI testing):

```bash
docker compose run --rm --build seed
```

The API is available at `http://localhost:8000/api` and the MinIO console at `http://localhost:9001` (credentials `deltadmin` / `deltasecret`).

## Environment Configuration

### Backend
Backend uses `DGCOMM_` prefixed environment variables:

- `DGCOMM_S3_ENDPOINT`: S3 endpoint URL (e.g., MinIO)
- `DGCOMM_S3_ADDRESSING_STYLE`: `path` or `virtual` (default: path)
- `DGCOMM_HMAC_SECRET`: Secret for download token signing
- `DGCOMM_CACHE_DIR`: Directory for delta cache operations
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: S3 credentials

### Frontend
Frontend uses `VITE_` prefixed variables in `.env.local`:

- `VITE_API_URL`: Backend API URL
- `VITE_ENABLE_UPLOADS`: Enable upload functionality
- `VITE_POLL_MS`: Polling interval for updates

## API Endpoints

- `GET /api/buckets` - List all buckets
- `GET /api/buckets/{bucket}/objects` - List objects in bucket
- `GET /api/buckets/{bucket}/objects/{key}/download` - Get signed download URL
- `POST /api/buckets/{bucket}/objects` - Upload object
- `DELETE /api/buckets/{bucket}/objects/{key}` - Delete object

## Testing

- **Backend**: pytest with fixtures, using `InMemoryDeltaGliderSDK` for isolation
- **Frontend**: Vitest with Testing Library for component testing
- **Integration**: Docker Compose provides MinIO for integration testing

## Related Projects

- **[DeltaGlider SDK](https://github.com/beshu-tech/deltaglider)**: The core delta compression and storage optimization library that powers this application

## License

This project is licensed under the same terms as the DeltaGlider SDK.
