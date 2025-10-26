# Development Scripts

This directory contains one-time test scripts and development utilities that were used during development but are not part of the production codebase.

## Test Scripts

### S3 Bucket Management
- `apply-multi-tier-policy.sh` - Apply multi-tier bucket policies for testing
- `update-bucket-policy.sh` - Update bucket policies
- `get-hetzner-bucket-info.sh` - Retrieve Hetzner S3 bucket information

### Testing & Validation
- `test-hetzner-s3.sh` - Test Hetzner S3 integration
- `test-readonly-credentials.sh` - Validate read-only credential scenarios

## Bucket Policies

Sample bucket policy configurations for testing:
- `bucket-policy-multi-tier.json` - Multi-tier storage policy
- `bucket-policy-simple-multi-tier.json` - Simplified multi-tier policy
- `new-bucket-policy.json` - Template for new bucket policies

## Usage

These scripts are for development and testing purposes only. They should not be used in production environments.

**Note**: Some scripts may contain hardcoded credentials or endpoints - review carefully before executing.
