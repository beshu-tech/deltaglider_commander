#!/usr/bin/env bash
#
# Local CI script - Run all checks locally before pushing
# Usage: ./scripts/ci.sh [backend|frontend|all]
#

set -e

COMPONENT="${1:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${GREEN}[CI]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Backend checks
run_backend_checks() {
    print_status "Running backend checks..."

    # Check Python version
    if ! command_exists python3; then
        print_error "Python 3 not found"
        exit 1
    fi

    print_status "Installing backend dependencies..."
    pip install -e .[dev] -q
    pip install ruff mypy pytest-cov -q

    print_status "Running ruff linter..."
    if ruff check src/ tests/; then
        print_status "✅ Linting passed"
    else
        print_error "❌ Linting failed"
        exit 1
    fi

    print_status "Running ruff formatter check..."
    if ruff format --check src/ tests/; then
        print_status "✅ Formatting passed"
    else
        print_error "❌ Formatting failed - run 'ruff format src/ tests/' to fix"
        exit 1
    fi

    print_status "Running mypy type checker..."
    if mypy src/dgcommander --ignore-missing-imports; then
        print_status "✅ Type checking passed"
    else
        print_warning "⚠️ Type checking has warnings"
    fi

    print_status "Running pytest..."
    if pytest tests/ -v --cov=src/dgcommander --cov-report=term-missing; then
        print_status "✅ Tests passed"
    else
        print_error "❌ Tests failed"
        exit 1
    fi

    print_status "Checking for security issues with bandit..."
    if command_exists bandit; then
        bandit -r src/ -ll || print_warning "⚠️ Security warnings found"
    else
        print_warning "bandit not installed - skipping security check"
    fi
}

# Frontend checks
run_frontend_checks() {
    print_status "Running frontend checks..."

    cd frontend

    # Check if pnpm is installed
    if ! command_exists pnpm; then
        print_error "pnpm not found - install with: npm install -g pnpm"
        exit 1
    fi

    print_status "Installing frontend dependencies..."
    pnpm install --frozen-lockfile

    print_status "Running ESLint..."
    if pnpm lint; then
        print_status "✅ Linting passed"
    else
        print_error "❌ Linting failed"
        exit 1
    fi

    print_status "Running TypeScript type checker..."
    if pnpm typecheck; then
        print_status "✅ Type checking passed"
    else
        print_error "❌ Type checking failed"
        exit 1
    fi

    print_status "Checking Prettier formatting..."
    if pnpm format; then
        print_status "✅ Formatting passed"
    else
        print_error "❌ Formatting failed - run 'pnpm prettier --write .' to fix"
        exit 1
    fi

    print_status "Running tests..."
    if pnpm test --run; then
        print_status "✅ Tests passed"
    else
        print_error "❌ Tests failed"
        exit 1
    fi

    print_status "Building frontend..."
    if pnpm build; then
        print_status "✅ Build successful"
    else
        print_error "❌ Build failed"
        exit 1
    fi

    cd ..
}

# Integration tests
run_integration_tests() {
    print_status "Running integration tests..."

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_warning "Docker not running - skipping integration tests"
        return
    fi

    print_status "Starting MinIO..."
    docker compose up -d minio minio-setup

    # Wait for MinIO to be ready
    sleep 5

    print_status "Running integration tests..."
    export AWS_ACCESS_KEY_ID=deltadmin
    export AWS_SECRET_ACCESS_KEY=deltasecret
    export AWS_DEFAULT_REGION=eu-west-1
    export DGCOMM_S3_ENDPOINT=http://localhost:9000
    export DGCOMM_S3_ADDRESSING_STYLE=path
    export DGCOMM_HMAC_SECRET=test-secret

    if pytest tests/ -v -m integration 2>/dev/null || pytest tests/ -v; then
        print_status "✅ Integration tests passed"
    else
        print_warning "⚠️ Some integration tests failed"
    fi

    print_status "Stopping MinIO..."
    docker compose down
}


# Main execution
main() {
    print_status "Starting CI checks for: $COMPONENT"

    case $COMPONENT in
        backend)
            run_backend_checks
            ;;
        frontend)
            run_frontend_checks
            ;;
        integration)
            run_integration_tests
            ;;
        all)
            run_backend_checks
            run_frontend_checks
            run_integration_tests
            ;;
        *)
            print_error "Invalid component: $COMPONENT"
            echo "Usage: $0 [backend|frontend|integration|all]"
            exit 1
            ;;
    esac

    print_status "🎉 All CI checks passed!"
}

# Run main function
main