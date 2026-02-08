# DGCommander - Simple ONE-WAY Makefile
#
# Usage:
#   make help         Show this help
#   make install      Install all dependencies
#   make test         Run all tests
#   make lint         Run all linters
#   make format       Format all code
#   make ci           Run full CI suite
#   make run          Run development servers
#   make clean        Clean build artifacts

.PHONY: help install test lint format ci ci-backend ci-frontend run clean backend-test frontend-test build-static docker typecheck security pre-commit dev-setup benchmark release check-version

# Default target
help:
	@echo "DGCommander Development Commands"
	@echo "================================"
	@echo "make install      - Install all dependencies"
	@echo "make link-local-sdk - Install deltaglider checkout in editable mode"
	@echo "make test         - Run all tests"
	@echo "make lint         - Run all linters"
	@echo "make format       - Format all code"
	@echo "make build-static - Build frontend and copy to Flask static"
	@echo ""
	@echo "⚠️  IMPORTANT: Run before committing:"
	@echo "make ci-backend   - Backend CI: lint, typecheck, test"
	@echo "make ci-frontend  - Frontend CI: lint, typecheck, test, build"
	@echo "make ci           - Run full CI suite (backend + frontend)"
	@echo ""
	@echo "make release v=X.Y.Z - Bump versions, commit, tag, and push"
	@echo "make check-version   - Verify version consistency across files"
	@echo ""
	@echo "make run          - Run development servers"
	@echo "make docker       - Build and run with Docker"
	@echo "make clean        - Clean build artifacts"

# Install dependencies
install:
	@echo "📦 Installing backend dependencies..."
	pip install -e .[dev,server]
	pip install ruff mypy pytest-cov bandit safety
	@if [ -d "external/deltaglider" ]; then \
		echo "🔗 Installing local deltaglider checkout..."; \
		pip install -e external/deltaglider; \
	fi
	@echo "📦 Installing frontend dependencies..."
	cd frontend && pnpm install

link-local-sdk:
	@echo "🔗 Installing local deltaglider checkout..."
	pip install -e external/deltaglider

# Run all tests
test: backend-test frontend-test

backend-test:
	@echo "🧪 Running backend tests..."
	pytest tests/ -v --cov=src/dgcommander --cov-report=term-missing

frontend-test:
	@echo "🧪 Running frontend tests..."
	cd frontend && ./node_modules/.bin/vitest run

# Build frontend and copy to static folder
build-static:
	@echo "🏗️  Building frontend..."
	cd frontend && pnpm build
	@echo "📦 Copying frontend build to Flask static folder..."
	rm -rf src/dgcommander/static/*
	cp -r frontend/dist/* src/dgcommander/static/
	@echo "✅ Frontend files copied to static folder"

# Run linters
lint:
	@echo "🔍 Linting backend..."
	ruff check src/ tests/
	mypy src/dgcommander --ignore-missing-imports || true
	@echo "🔍 Linting frontend..."
	cd frontend && pnpm lint

# Format code
format:
	@echo "✨ Formatting backend..."
	ruff format src/ tests/
	@echo "✨ Formatting frontend..."
	cd frontend && pnpm prettier --write .

# Type checking
typecheck:
	@echo "📝 Type checking backend..."
	mypy src/dgcommander --ignore-missing-imports
	@echo "📝 Type checking frontend..."
	cd frontend && pnpm typecheck

# Backend CI suite
ci-backend:
	@echo "🚀 Running backend CI suite..."
	@echo "================================"
	@echo "Step 1/3: Linting backend..."
	@ruff check src/ tests/
	@echo "✅ Backend linting passed"
	@echo ""
	@echo "Step 2/3: Type checking backend..."
	@mypy src/dgcommander --ignore-missing-imports
	@echo "✅ Backend type checking passed"
	@echo ""
	@echo "Step 3/3: Running backend tests..."
	@pytest tests/ -v --cov=src/dgcommander --cov-report=term-missing
	@echo "✅ Backend tests passed"
	@echo ""
	@echo "✅ Backend CI suite completed successfully!"

# Frontend CI suite
ci-frontend:
	@echo "🚀 Running frontend CI suite..."
	@echo "================================"
	@echo "Step 1/4: Linting frontend..."
	@cd frontend && pnpm lint
	@echo "✅ Frontend linting passed"
	@echo ""
	@echo "Step 2/4: Type checking frontend..."
	@cd frontend && pnpm typecheck
	@echo "✅ Frontend type checking passed"
	@echo ""
	@echo "Step 3/4: Running frontend tests..."
	@cd frontend && ./node_modules/.bin/vitest run
	@echo "✅ Frontend tests passed"
	@echo ""
	@echo "Step 4/4: Building frontend..."
	@cd frontend && pnpm build
	@echo "✅ Frontend build completed with no errors/warnings"
	@echo ""
	@echo "✅ Frontend CI suite completed successfully!"

# Run full CI suite (backend + frontend)
ci: ci-backend ci-frontend
	@echo ""
	@echo "=========================================="
	@echo "✅ Full CI suite completed successfully!"
	@echo "=========================================="
	@echo "You are ready to commit your changes."

# Run development servers
run:
	@echo "🏃 Starting development servers..."
	@echo "Backend will run on http://localhost:8000"
	@echo "Frontend will run on http://localhost:5173"
	@trap 'kill %1; kill %2' INT; \
	(cd frontend && pnpm dev) & \
	python -m flask --app src.dgcommander.app:create_app run --host 0.0.0.0 --port 8000 & \
	wait

# Docker operations
docker:
	@echo "🐳 Building Docker image..."
	docker compose build
	@echo "🐳 Starting services..."
	docker compose up minio backend

docker-test:
	@echo "🐳 Running tests in Docker..."
	docker compose run --rm backend pytest tests/ -v

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".coverage" -delete
	rm -rf dist/ build/ htmlcov/ coverage.xml
	cd frontend && rm -rf dist/ node_modules/.vite/

# Quick checks before commit
pre-commit: format ci
	@echo ""
	@echo "✅ All pre-commit checks passed!"
	@echo "✅ Ready to commit!"

# Development setup
dev-setup: install
	@echo "🔧 Setting up git hooks..."
	@echo '#!/bin/sh\nmake pre-commit' > .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "✅ Development environment ready!"

# Security checks
security:
	@echo "🔒 Running security checks..."
	bandit -r src/ -ll
	safety check || true
	pip-audit || true

# Performance benchmarks
benchmark:
	@echo "⚡ Running performance benchmarks..."
	python -m pytest tests/ -v -m benchmark --benchmark-only

# Documentation
docs:
	@echo "📚 Generating documentation..."
	@echo "Documentation generation not yet configured"

# Database migrations (if needed in future)
migrate:
	@echo "🗄️ No database migrations needed (using S3)"

# Verify version consistency across package.json and pyproject.toml
check-version:
	@PY_VER=$$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])"); \
	JS_VER=$$(node -p "require('./frontend/package.json').version"); \
	if [ "$$PY_VER" != "$$JS_VER" ]; then \
		echo "❌ Version mismatch: pyproject.toml=$$PY_VER, package.json=$$JS_VER"; \
		exit 1; \
	fi; \
	echo "✅ Versions consistent: $$PY_VER"

# Release: bump versions, commit, tag, and push
# Usage: make release v=1.3.2
release:
	@if [ -z "$(v)" ]; then echo "❌ Usage: make release v=X.Y.Z"; exit 1; fi
	@echo "🚀 Releasing v$(v)..."
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "❌ Working tree is dirty. Commit or stash changes first."; \
		exit 1; \
	fi
	@sed -i '' 's/"version": ".*"/"version": "$(v)"/' frontend/package.json
	@sed -i '' 's/^version = ".*"/version = "$(v)"/' pyproject.toml
	@$(MAKE) --no-print-directory check-version
	@$(MAKE) --no-print-directory ci
	@git add frontend/package.json pyproject.toml
	@git commit -m "release: v$(v)"
	@git tag -a "v$(v)" -m "release: v$(v)"
	@echo ""
	@echo "✅ Tagged v$(v). Push with:"
	@echo "   git push origin main && git push origin v$(v)"

.DEFAULT_GOAL := help
