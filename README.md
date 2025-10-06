# DeltaGlider Commander

![DeltaGlider Commander UI](dg_screenshot.png)

DeltaGlider Commander is a Flask-based backend service with a React frontend that provides a REST API for browsing and managing objects in S3 buckets through the [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider). The application focuses on delta compression and storage optimization.

## Features

- **S3 Object Management**: Browse, download, and upload objects in S3-compatible storage
- **Delta Compression**: Leverages DeltaGlider SDK for efficient storage and transfer
- **Modern Web UI**: React-based frontend with TypeScript and Vite
- **RESTful API**: Comprehensive Flask API with HMAC authentication and rate limiting
- **Docker Support**: Multi-stage Docker builds with automated CI/CD pipeline
- **Performance Optimizations**: Fast metadata retrieval with optional quick-mode listing
- **Security**: Bandit scanning, secure temp directory handling, HMAC-signed download tokens

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

- `DGCOMM_HMAC_SECRET`: Secret for download token signing (required)
- `DGCOMM_CACHE_DIR`: Directory for delta cache operations (optional)

**Note**: S3 credentials are no longer configured via environment variables. Instead, users provide their AWS/S3 credentials through the web UI at runtime, which are stored in the browser's session storage and passed to the backend via session cookies.

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

## Testing & CI/CD

### Testing
- **Backend**: pytest with fixtures, using `InMemoryDeltaGliderSDK` for isolation
- **Frontend**: Vitest with Testing Library for component testing
- **Integration**: Docker Compose provides MinIO for integration testing
- **Quality Gates**: Ruff linting, mypy type checking, Bandit security scanning

### CI/CD Pipeline
- **Automated Testing**: Full test suite runs on every push and PR
- **Quality Checks**: Code formatting (Prettier), linting (ESLint/Ruff), type checking (TypeScript/mypy)
- **Security Scanning**: Bandit for Python security vulnerabilities
- **Docker Images**: Automated builds published to Docker Hub on tags (e.g., `v0.1.2` → `beshultd/deltaglider_commander:0.1.2`)

## Docker Deployment

### Using Pre-built Image

Pre-built Docker images are available on Docker Hub:

```bash
# Pull the latest version
docker pull beshultd/deltaglider_commander:latest

# Or pull a specific version
docker pull beshultd/deltaglider_commander:0.1.2

# Copy env.example to .env and configure required settings
cp env.example .env
# Edit .env with your HMAC secret and other optional values

# Run with docker-compose
docker compose -f docker-compose.prod.yml up -d
```

After starting the application, navigate to the Settings page in the web UI to configure your S3/AWS credentials. These credentials are stored in your browser's session storage and used for all API requests.

### Building Your Own Image

```bash
# Build the image
docker build -t dgcommander .

# Run with required environment variables
docker run -p 8000:8000 \
  -e DGCOMM_HMAC_SECRET=your-hmac-secret \
  dgcommander
```

**Note**: S3 credentials are no longer passed as environment variables. Configure them through the web UI after starting the application.

## Recent Improvements (v0.1.2)

### Performance Enhancements
- **Fast Metadata Retrieval**: Optimized `get_metadata` endpoint using `list_objects` instead of `get_object`
- **Quick-Mode Listing**: Optional quick listing mode for faster bucket browsing
- **Improved Error Handling**: Better error messages and navigation edge cases

### Security & Quality
- **Security Hardening**: Fixed Bandit warnings by using `tempfile.gettempdir()` instead of hardcoded `/tmp` paths
- **CI/CD Pipeline**: Comprehensive GitHub Actions workflow with quality gates
- **Type Safety**: Full mypy type checking with strict configuration
- **Code Quality**: Ruff linting and Prettier formatting enforcement

### Bug Fixes
- Fixed S3 navigation issues with prefix handling
- Fixed metadata endpoint performance issues
- Resolved Docker build issues with frontend asset compilation
- Fixed CI test flakiness with clipboard operations

### Infrastructure
- Multi-stage Docker builds with optimized caching
- Automated Docker Hub publishing on version tags
- Integration testing with MinIO in CI pipeline
- pnpm 9 support with updated lockfile

## Related Projects

- **[DeltaGlider SDK](https://github.com/beshu-tech/deltaglider)**: The core delta compression and storage optimization library that powers this application

## License

This project is licensed under the same terms as the DeltaGlider SDK.
