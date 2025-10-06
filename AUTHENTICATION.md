# Authentication Flow Documentation

## Overview

DeltaGlider Commander uses a session-based authentication system with AWS credentials stored in the browser (localStorage) and session state managed by the backend via HTTP-only cookies.

## Architecture

### Frontend Components

1. **CredentialStorage** (`frontend/src/services/credentialStorage.ts`)
   - Manages AWS credentials in browser localStorage
   - Methods: `save()`, `load()`, `clear()`, `exists()`
   - Credentials stored include: accessKeyId, secretAccessKey, region, endpoint

2. **SessionManager** (`frontend/src/services/sessionManager.ts`)
   - Handles session lifecycle with backend
   - Creates/destroys sessions by sending credentials to backend
   - Backend responds by setting HTTP-only session cookie

3. **apiWithAuth** (`frontend/src/lib/api/authInterceptor.ts`)
   - Simplified wrapper around API calls
   - Handles 401 authentication errors
   - Attempts to recreate session once if credentials are stored
   - Redirects to settings page if authentication fails

### Backend Components

1. **Session Store** (`src/dgcommander/auth/`)
   - Manages session state in memory (or Redis in production)
   - Sessions tied to HTTP-only cookies
   - Sessions expire after configured timeout

2. **Middleware** (`src/dgcommander/auth/middleware.py`)
   - `require_session_or_env`: Validates session or falls back to environment variables
   - Injects `g.sdk_client` and `g.credentials` into request context

## Authentication Flow

### Initial Login
1. User enters AWS credentials on `/settings` page
2. Frontend calls `POST /api/auth/session` with credentials
3. Backend validates credentials by attempting S3 ListBuckets
4. If valid, backend creates session and sets HTTP-only cookie
5. Frontend stores credentials in localStorage for future session refresh
6. User redirected to main application

### API Request Flow
1. Frontend makes API call using `apiWithAuth()` wrapper
2. Request automatically includes session cookie (via `credentials: 'include'`)
3. Backend middleware validates session cookie
4. If session valid, request proceeds
5. If session invalid/expired, backend returns 401

### Session Refresh (Automatic)
1. When `apiWithAuth()` receives 401 with session error codes
2. Checks if credentials exist in localStorage
3. If yes, attempts to create new session with stored credentials
4. If successful, retries original request
5. If fails, clears stored credentials and redirects to `/settings`

### Logout
1. User clicks logout
2. Frontend calls `DELETE /api/auth/session`
3. Backend destroys session
4. Frontend clears stored credentials
5. User redirected to `/settings`

## Error Handling

### Session Errors (401)
- `session_not_found`: No session cookie or session doesn't exist
- `session_expired`: Session exists but has timed out
- `no_session`: Generic session error

### Credential Errors (403)
- `invalid_credentials`: AWS credentials are invalid
- `access_denied`: Valid credentials but insufficient S3 permissions

## Security Considerations

1. **Session cookies are HTTP-only**: Cannot be accessed by JavaScript, preventing XSS attacks
2. **Credentials in localStorage**: Allows automatic session refresh but requires secure context (HTTPS)
3. **HMAC-signed download tokens**: Time-limited tokens for direct S3 downloads
4. **No credentials in URL**: All sensitive data transmitted via POST body or cookies

## Configuration

### Frontend
- Session timeout warnings can be configured
- Credentials storage can be disabled for higher security

### Backend
- `DGCOMM_HMAC_SECRET`: Required for download token signing
- Session timeout configurable (default: 30 minutes)
- Rate limiting on authentication endpoints

## Testing

### Manual Testing
1. Log in with valid credentials
2. Wait for session to expire
3. Make an API call - should auto-refresh
4. Clear localStorage, make API call - should redirect to settings

### Automated Testing
- Unit tests mock localStorage and session endpoints
- Integration tests use in-memory session store
- E2E tests validate full authentication flow