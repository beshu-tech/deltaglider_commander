# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeltaGlider Commander (dgcommander) is a Flask-based backend service with a React frontend that provides a REST API for browsing and managing objects in S3 buckets through the DeltaGlider SDK. The application focuses on delta compression and storage optimization.

## Development Commands

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

# Local development with Docker
docker compose up --build minio backend  # Start MinIO and backend
docker compose run --rm --build seed    # Seed sample data (optional)
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
   - `downloads.py`: Signed download URL generation with HMAC tokens

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
   - Abstract protocol `DeltaGliderSDK` with S3 and in-memory implementations
   - Delta compression for storage optimization
   - Physical vs logical object distinction

2. **Session-Based Authentication**
   - S3 credentials stored in browser sessionStorage, passed via HTTP-only session cookies
   - Session middleware (`require_session_or_env`) injects `g.sdk_client` and `g.credentials`
   - HMAC-signed tokens for download URLs with embedded credentials (5-minute TTL)
   - Rate limiting on object listing endpoints

3. **Caching Strategy**
   - In-memory caching via `CacheRegistry`
   - Configurable cache directories for delta operations

## Environment Configuration

Backend uses `DGCOMM_` prefixed environment variables:

- `DGCOMM_HMAC_SECRET`: Secret for download token signing (required)
- `DGCOMM_CACHE_DIR`: Directory for delta cache operations (optional)

**Note**: S3 credentials are configured through the web UI at runtime (`/settings` page), not via environment variables. Credentials are stored in browser sessionStorage and passed securely to the backend via session cookies.

Frontend uses `VITE_` prefixed variables in `.env.local`:

- `VITE_API_URL`: Backend API URL
- `VITE_ENABLE_UPLOADS`: Enable upload functionality
- `VITE_POLL_MS`: Polling interval for updates

## Testing Approach

- **Backend**: pytest with fixtures in `conftest.py`, using `InMemoryDeltaGliderSDK` for isolation
- **Frontend**: Vitest with Testing Library for component testing
- **Docker Compose**: Provides MinIO for integration testing

## Development Workflow

1. Backend changes are immediately reflected when running with Flask development server
2. Frontend uses Vite HMR for instant updates
3. Docker Compose setup mimics production environment with MinIO
4. Tests can be run in isolation or against the Docker environment