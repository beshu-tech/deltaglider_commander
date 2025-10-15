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

.PHONY: help install test lint format ci run clean backend-test frontend-test build-static types docker

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
	@echo "make ci           - Run full CI suite"
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
	cd frontend && pnpm test --run

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

# Generate TypeScript types from Pydantic
types:
	@echo "🔄 Generating TypeScript types..."
	python scripts/generate_types.py

# Run full CI suite locally
ci:
	@echo "🚀 Running full CI suite..."
	./scripts/ci.sh all

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
pre-commit: format lint typecheck test
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

.DEFAULT_GOAL := help
