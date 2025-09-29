# Repository Guidelines

## Project Structure & Module Organization
- Backend Flask code sits in `src/dgcommander`; blueprints live in `api/`, services in `services/`, and shared helpers in `util/` plus `middleware/`.
- Tests reside in `tests/` and rely on fixtures from `conftest.py`; sample objects in `releases/` back integration-style assertions.
- The React frontend is in `frontend/src`; Vite emits bundles to `frontend/dist` which should be copied into `src/dgcommander/static/` before shipping.
- `Dockerfile` and `docker-compose.yml` run the API alongside MinIO and the DeltaGlider SDK for end-to-end development.

## Build, Test, and Development Commands
- `python3 -m venv .venv && source .venv/bin/activate` followed by `pip install -e .[dev]` prepares the backend toolchain.
- `pytest` executes the backend suite with warnings promoted to errors (see `pyproject.toml`).
- `pnpm install` (use pnpm to respect the lockfile), `pnpm dev`, `pnpm build`, and `pnpm test` cover frontend workflows.
- `docker compose up --build minio backend` launches the local stack; `docker compose run --rm --build seed` populates example releases.

## Coding Style & Naming Conventions
- Follow PEP 8, four-space indentation, and rich type hints; keep blueprints thin and delegate work to services or dataclasses (`deps.py`).
- JSON payloads stay snake_case per `backend.txt`; mirror this contract in schemas and tests.
- Frontend modules use PascalCase filenames and colocate hooks/components inside `frontend/src/features/<domain>`.

## Testing Guidelines
- Place backend tests under `tests/` named `test_<area>.py`; reuse the provided `client` and `sample_sdk` fixtures to avoid external dependencies.
- Frontend tests should sit next to the component as `Name.test.tsx` and rely on Vitest plus Testing Library.
- For focused debugging, run `pytest -k pattern` or `pnpm test --runInBand`; ensure new behaviors cover success and failure paths.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, or `test:` and limit subject lines to 72 characters.
- Describe API or UI changes in the body, reference relevant RFC sections, and list manual or automated test evidence.
- Pull requests must mention new environment variables, static assets, or seed data and confirm `pytest` + `pnpm test` passed locally.

## Security & Configuration Tips
- Secrets load from `DGCOMM_HMAC_SECRET` and the `DGCOMM_S3_*` variables; never commit real credentials and document defaults when they change.
- Rate limiting and token TTLs come from `DGCommanderConfig`; modify them with accompanying tests and release notes.
- Local caches use `DGCOMM_CACHE_DIR` (default `/tmp/dgcommander-cache`); purge it if you need a clean profiling baseline.
