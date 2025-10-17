# Multi-Worker Session Storage

## Problem

DeltaGlider Commander runs with 4 Gunicorn workers (`-w 4`) in production for parallel request handling. The original `SessionStore` implementation used in-memory storage (`dict[str, SessionData]`), which caused authentication failures in multi-worker deployments because:

1. **Separate Memory Spaces**: Each Gunicorn worker process has its own isolated memory
2. **Session Not Shared**: When a user authenticates (Worker 1), the session is only stored in Worker 1's memory
3. **Random Routing**: Subsequent requests may hit Worker 2, 3, or 4, which don't have the session
4. **Authentication Failures**: Users experience random 401 Unauthorized errors depending on which worker handles the request

## Solution

Implemented `FileSystemSessionStore` for production deployments, which stores sessions on disk where all workers can access them.

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Worker 1   │     │  Worker 2   │     │  Worker 3   │     │  Worker 4   │
│             │     │             │     │             │     │             │
│  Memory:    │     │  Memory:    │     │  Memory:    │     │  Memory:    │
│  (isolated) │     │  (isolated) │     │  (isolated) │     │  (isolated) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                   │
                      ┌────────────▼────────────┐
                      │  Shared Filesystem      │
                      │                         │
                      │  /tmp/dgcommander-sessions/  │
                      │  ├── session1.session   │
                      │  ├── session2.session   │
                      │  ├── session3.session   │
                      │  └── .index             │
                      └─────────────────────────┘
```

### Key Features

1. **Shared Storage**: All workers read/write to the same filesystem directory
2. **Cross-Process Locking**: `fcntl.flock()` prevents race conditions
3. **TTL & LRU Eviction**: Maintains all existing features (30-minute TTL, max 20 sessions, LRU eviction)
4. **Credential Deduplication**: Same credentials reuse existing sessions
5. **Pickle Serialization**: Stores `SessionData` objects including SDK clients
6. **Test Mode Fallback**: Uses in-memory store for tests (faster, simpler)

### File Structure

```
/tmp/dgcommander-sessions/
├── .index                     # LRU access order (list of session IDs)
├── .lock                      # Cross-process lock file
├── <session_id1>.session      # Pickled SessionData object
├── <session_id2>.session
└── <session_id3>.session
```

### Configuration

**Environment Variables**:
- `DGCOMM_SESSION_DIR`: Session storage directory (default: `/tmp/dgcommander-sessions`)
- `DGCOMM_SESSION_MAX_SIZE`: Maximum concurrent sessions (default: 20)
- `DGCOMM_SESSION_IDLE_TTL`: Session idle timeout in seconds (default: 1800 = 30 minutes)

**Docker Volume**:
```yaml
volumes:
  - dgcommander-sessions:/tmp/dgcommander-sessions
```

This ensures sessions persist across container restarts and are shared among all workers.

## Implementation Details

### Thread Safety

**Thread-Level**: `threading.RLock()` for thread safety within a worker
**Process-Level**: `fcntl.flock()` for cross-process synchronization between workers

### Serialization

Uses Python's `pickle` module to serialize:
- AWS credentials (`dict`)
- SDK client objects (`DeltaGliderSDK`)
- Access timestamps (`float`)

**Security Note**: Pickle files are written and read by the application itself, not from untrusted sources.

### Deadlock Prevention

The original implementation had a recursive locking issue where `find_by_credentials_hash()` was called from within `create_or_reuse()` while already holding the lock. Fixed by introducing `_find_by_credentials_hash_unlocked()` internal method.

## Testing

Comprehensive test suite in `tests/test_filesystem_session_store.py`:

- ✅ Session creation and retrieval
- ✅ Credential deduplication (reuse same session)
- ✅ TTL expiration
- ✅ LRU eviction
- ✅ Concurrent access safety
- ✅ Persistence across store instances (simulates multi-worker)
- ✅ File creation verification

## Performance Characteristics

| Metric | In-Memory | Filesystem | Notes |
|--------|-----------|------------|-------|
| Read Latency | ~1µs | ~100-500µs | Disk I/O overhead |
| Write Latency | ~1µs | ~200-800µs | Disk write + fsync |
| Lock Overhead | ~10µs | ~50-100µs | File locking overhead |
| Session Operations/sec | ~100k | ~2-5k | Still sufficient for auth |

**Conclusion**: Filesystem storage is slightly slower but fully acceptable for session operations (authenticate once, reuse session).

## Migration Path

### v1.2.0 → v1.2.1

**Automatic migration**: No action required. The application automatically:
1. Detects `test_mode` and uses in-memory store for tests
2. Uses filesystem store for production deployments
3. Creates session directory if it doesn't exist

**Docker Compose**:
```yaml
backend:
  volumes:
    - dgcommander-sessions:/tmp/dgcommander-sessions  # Add this line
```

**Kubernetes**:
```yaml
volumeMounts:
  - name: session-storage
    mountPath: /tmp/dgcommander-sessions
volumes:
  - name: session-storage
    emptyDir: {}  # Or persistent volume
```

## Alternatives Considered

### Redis/Memcached
- **Pros**: Fast, production-ready, built-in TTL
- **Cons**: Additional infrastructure, serialization complexity, network overhead

### Database (PostgreSQL/MySQL)
- **Pros**: Persistent, transactional, queryable
- **Cons**: Overkill for sessions, adds database dependency, slower

### Flask-Session Library
- **Pros**: Battle-tested, supports multiple backends
- **Cons**: Additional dependency, less control over SDK client caching

**Decision**: Filesystem storage provides the best balance of simplicity, performance, and zero additional infrastructure.

## Troubleshooting

### Sessions Not Persisting

**Symptom**: Users logged out after each request

**Causes**:
1. Session directory not mounted as Docker volume
2. Permission issues (worker can't write to session directory)
3. Filesystem full

**Fix**:
```bash
# Check volume mounting
docker inspect <container_id> | grep Mounts

# Check permissions
docker exec <container_id> ls -la /tmp/dgcommander-sessions

# Check disk space
docker exec <container_id> df -h /tmp
```

### High Disk I/O

**Symptom**: Slow authentication, high iowait

**Causes**:
1. Too many concurrent sessions (increase `DGCOMM_SESSION_MAX_SIZE`)
2. Very short TTL (increase `DGCOMM_SESSION_IDLE_TTL`)

**Fix**:
```bash
# Increase session size and TTL
DGCOMM_SESSION_MAX_SIZE=50
DGCOMM_SESSION_IDLE_TTL=3600  # 1 hour
```

### Lock Contention

**Symptom**: Slow session operations under high load

**Causes**:
1. Too many workers competing for file locks

**Fix**:
- Consider Redis for high-traffic deployments (>1000 req/s)
- Reduce worker count if CPU-bound

## References

- Original issue: Multi-worker session storage problem with 4 Gunicorn workers
- Implementation: `src/dgcommander/auth/filesystem_session_store.py`
- Tests: `tests/test_filesystem_session_store.py`
- Configuration: `docker-compose.yml`, `Dockerfile`
