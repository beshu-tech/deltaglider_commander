# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeltaGlider Commander (dgcommander) is a Flask-based backend service with a React frontend that provides a REST API for browsing and managing objects in S3 buckets through the DeltaGlider SDK. The application focuses on delta compression and storage optimization.

## Development Commands

### ⚠️ IMPORTANT: Pre-Commit Checks

**ALWAYS run the appropriate CI command(s) before committing:**

```bash
# If you modified backend code:
make ci-backend    # Runs: lint, typecheck, tests (with coverage)

# If you modified frontend code:
make ci-frontend   # Runs: lint, typecheck, tests, build (ensures no errors/warnings)

# If you modified both or want to be safe:
make ci            # Runs full CI suite (backend + frontend)
```

**All three commands must pass with zero errors/warnings before committing.**

### Quick Start (Makefile)

```bash
make help          # Show all available commands
make install       # Install all dependencies (backend + frontend)
make test          # Run all tests
make lint          # Run all linters
make format        # Format all code
make run           # Run development servers (backend + frontend)
make build-static  # Build frontend and copy to Flask static
make clean         # Clean build artifacts
```

### Backend (Python/Flask)

```bash
# Setup virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]

# Run tests
pytest
pytest tests/test_buckets_api.py  # Run specific test file
pytest -k test_name               # Run specific test
pytest -v --cov=src/dgcommander   # Run with coverage

# Linting and formatting
ruff check src/ tests/            # Check code style
ruff format src/ tests/           # Format code
mypy src/dgcommander              # Type checking

# Local development with Docker
docker compose up --build minio backend  # Start MinIO and backend
docker compose run --rm --build seed    # Seed sample data (optional)

# Run Flask development server
DGCOMM_HMAC_SECRET=dev flask --app src/dgcommander/app.py run
```

### Frontend (React/TypeScript/Vite)

```bash
cd frontend
pnpm install

# Development
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Build for production
pnpm preview      # Preview production build

# Code quality
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm test         # Run tests with Vitest
pnpm format       # Check Prettier formatting
```

### Running Frontend Tests

**IMPORTANT**: Never run `pnpm test --run` directly — pnpm interprets `--run` as its own flag and it won't be passed to vitest, causing vitest to start in watch mode and hang forever. Instead:

- Use `make ci-frontend` or `make ci` (preferred — runs lint, typecheck, tests, and build)
- Or run vitest directly: `cd frontend && ./node_modules/.bin/vitest run`

## Architecture

### Backend Structure

The backend follows a layered architecture with clear separation of concerns:

1. **API Layer** (`src/dgcommander/api/`)
   - Flask blueprints for REST endpoints
   - `buckets.py`, `objects.py`, `downloads.py`, `uploads.py`
   - Each blueprint handles HTTP requests/responses

2. **Service Layer** (`src/dgcommander/services/`)
   - `deltaglider.py`: SDK abstraction and S3 integration
   - `catalog.py`: Object cataloging and metadata management
   - `presigned.py`: Presigned URL generation with automatic delta decompression
   - `list_cache.py`: In-memory caching for object listings

3. **Dependency Injection** (`src/dgcommander/deps.py`)
   - Central configuration management via `DGCommanderConfig`
   - Service container initialization and wiring
   - Environment variable handling with `DGCOMM_` prefix

4. **Application Factory** (`src/dgcommander/app.py`)
   - Flask app creation with CORS support
   - Blueprint registration and static file serving
   - Service container extension registration

### Frontend Architecture

React SPA with modern tooling:

1. **Routing** (`frontend/src/app/routes.tsx`)
   - TanStack Router for type-safe routing
   - Routes: `/buckets`, `/b/{bucket}`, `/b/{bucket}/o/{objectKey}`, `/b/{bucket}/upload`

2. **State Management**
   - TanStack Query for server state and caching
   - React Hook Form for form handling
   - Context for global app state

3. **Component Organization**
   - `features/`: Domain-specific components (buckets, objects, upload)
   - `lib/ui/`: Reusable UI components
   - `pages/`: Route-level page components
   - `app/layout/`: Layout components (Header, Sidebar, AppLayout)

### Key Integration Points

1. **DeltaGlider SDK Integration**
   - Abstract protocol `DeltaGliderSDK` ([src/dgcommander/sdk/protocol.py](src/dgcommander/sdk/protocol.py)) with S3 and in-memory implementations
   - Delta compression for storage optimization
   - Physical vs logical object distinction
   - Two implementations:
     - `S3DeltaGliderSDK`: Real S3 integration via boto3 and deltaglider
     - `InMemoryDeltaGliderSDK`: Testing implementation with mocked data

2. **Session-Based Authentication**
   - S3 credentials stored in browser sessionStorage, passed via HTTP-only session cookies
   - Session middleware (`require_session_or_env` in [src/dgcommander/auth/middleware.py](src/dgcommander/auth/middleware.py)) injects `g.sdk_client` and `g.credentials`
   - Session stores support multi-worker deployments via filesystem-based storage
   - Rate limiting on object listing endpoints

3. **Download Flow**
   - Presigned URLs generated by `PresignedUrlService` ([src/dgcommander/services/presigned.py](src/dgcommander/services/presigned.py))
   - Automatic delta decompression: compressed files are transparently decompressed to temporary location
   - Background purge job (`jobs/purge_scheduler.py`) cleans up temporary files periodically
   - Separate housekeeping credentials supported for purge job (limited IAM permissions)

4. **Caching Strategy**
   - Object listing cache (`ListObjectsCache`) with configurable TTL (default 30s)
   - Cache invalidation on object mutations (uploads, deletes)
   - Configurable cache directories for delta operations

## Environment Configuration

Backend uses `DGCOMM_` prefixed environment variables:

**Required:**
- `DGCOMM_HMAC_SECRET`: Secret for download token signing (generate with `openssl rand -hex 32`)

**Optional:**
- `DGCOMM_CACHE_DIR`: Directory for delta cache operations
- `DGCOMM_LOG_LEVEL`: Logging verbosity (DEBUG, INFO, WARNING, ERROR)
- `DGCOMM_LIST_CACHE_TTL`: Object listing cache TTL in seconds (default: 30)
- `DGCOMM_LIST_CACHE_MAX_SIZE`: Max cached folders (default: 100)
- `DGCOMM_PURGE_INTERVAL_HOURS`: Hours between purge runs (default: 1)

**Housekeeping Credentials (optional, for background cleanup with limited IAM):**
- `DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY`: Separate access key for purge job
- `DGCOMM_HOUSEKEEPING_S3_SECRET_KEY`: Separate secret key for purge job
- `DGCOMM_HOUSEKEEPING_S3_ENDPOINT`: S3 endpoint for purge job
- `DGCOMM_HOUSEKEEPING_S3_REGION`: AWS region for purge job

**Note**: S3 credentials for normal operations are configured through the web UI at runtime (`/settings` page), not via environment variables. Credentials are stored in browser sessionStorage and passed securely to the backend via session cookies.

Frontend uses `VITE_` prefixed variables in `.env.local`:

- `VITE_API_URL`: Backend API URL
- `VITE_ENABLE_UPLOADS`: Enable upload functionality
- `VITE_POLL_MS`: Polling interval for updates

## Testing Approach

- **Backend**: pytest with fixtures in `conftest.py`, using `InMemoryDeltaGliderSDK` for isolation
- **Frontend**: Vitest with Testing Library for component testing
- **Docker Compose**: Provides MinIO for integration testing

## Development Workflow

### Standard Development Cycle

1. Make your code changes
2. Test locally with `make run` (backend + frontend dev servers)
3. **CRITICAL**: Run appropriate CI checks before committing:
   - Backend changes: `make ci-backend`
   - Frontend changes: `make ci-frontend`
   - Both or unsure: `make ci`
4. Fix any errors/warnings until CI passes completely
5. Commit your changes

### Development Features

- Backend changes are immediately reflected when running with Flask development server
- Frontend uses Vite HMR for instant updates
- Docker Compose setup mimics production environment with MinIO
- Tests can be run in isolation or against the Docker environment

### CI Command Details

**`make ci-backend`** runs:
1. Linting with ruff
2. Type checking with mypy
3. Tests with pytest and coverage report

**`make ci-frontend`** runs:
1. ESLint linting
2. TypeScript type checking
3. Vitest tests
4. Production build (catches build-time errors/warnings)

**Note**: The production build step in `ci-frontend` is crucial as it catches issues that may not appear in development mode (e.g., unused imports, type errors in production builds, build configuration issues).