#!/bin/bash
# Apply multi-tier bucket policy with full access for ROR_RW and read-only for others

set -e

# Hetzner S3 Configuration
export AWS_ACCESS_KEY_ID="MD61KMA143ET3MPVQ5HR"
export AWS_SECRET_ACCESS_KEY="2ydqTSZSLcyWHRbnjud6zpZsqDmsVzPqKwSqmAz2"
ENDPOINT="https://fsn1.your-objectstorage.com"
BUCKET="ror-builds-xdelta"
REGION="fsn1"
POLICY_FILE="bucket-policy-multi-tier.json"

echo "=========================================="
echo "Apply Multi-Tier Bucket Policy"
echo "=========================================="
echo "Endpoint: $ENDPOINT"
echo "Bucket: $BUCKET"
echo "Policy File: $POLICY_FILE"
echo ""

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo "❌ Policy file not found: $POLICY_FILE"
    exit 1
fi

echo "New Multi-Tier Policy:"
echo "-------------------------------------------"
cat "$POLICY_FILE" | python3 -m json.tool
echo "-------------------------------------------"
echo ""

echo "Policy Summary:"
echo "  ✅ FULL ACCESS: MD61KMA143ET3MPVQ5HR (ROR_RW)"
echo "     - Read, Write, Delete, List, Multipart Uploads"
echo ""
echo "  📖 READ-ONLY: HI3AJPWFFN4PJG48G5OF"
echo "     - Read and List only"
echo ""
echo "  🚫 DENY ALL: Any other credentials"
echo "     - Explicitly blocked"
echo ""

read -p "Apply this policy? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Apply the bucket policy
echo "Applying bucket policy..."
if aws s3api put-bucket-policy \
    --bucket "$BUCKET" \
    --policy file://"$POLICY_FILE" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"; then
    echo ""
    echo "✅ Successfully applied multi-tier bucket policy!"
    echo ""

    echo "Verifying new policy..."
    aws s3api get-bucket-policy \
        --bucket "$BUCKET" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" \
        --query Policy \
        --output text | python3 -m json.tool
else
    ERROR_CODE=$?
    echo ""
    echo "❌ Failed to apply bucket policy"
    echo "Error code: $ERROR_CODE"
    exit 1
fi

echo ""
echo "=========================================="
echo "Testing Credentials"
echo "=========================================="

# Test full access credentials
echo ""
echo "Testing FULL ACCESS credentials (MD61KMA143ET3MPVQ5HR)..."
TEST_FILE="/tmp/multi-tier-test-$(date +%s).txt"
echo "Test content" > "$TEST_FILE"
TEST_KEY="test-permissions/full-access-test-$(date +%s).txt"

if aws s3 cp "$TEST_FILE" "s3://$BUCKET/$TEST_KEY" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" >/dev/null 2>&1; then
    echo "  ✅ Upload: SUCCESS"

    # Try to delete
    if aws s3 rm "s3://$BUCKET/$TEST_KEY" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" >/dev/null 2>&1; then
        echo "  ✅ Delete: SUCCESS"
    else
        echo "  ❌ Delete: FAILED"
    fi
else
    echo "  ❌ Upload: FAILED"
fi

rm -f "$TEST_FILE"

echo ""
echo "=========================================="
echo "✅ Multi-Tier Policy Applied Successfully!"
echo "=========================================="
echo ""
echo "Credential Breakdown:"
echo ""
echo "1. FULL ACCESS (Read/Write/Delete):"
echo "   Access Key: MD61KMA143ET3MPVQ5HR"
echo "   Use for: DeltaGlider Commander, uploads, management"
echo ""
echo "2. READ-ONLY (Read/List):"
echo "   Access Key: HI3AJPWFFN4PJG48G5OF"
echo "   Use for: Public downloads, read-only applications"
echo ""
echo "3. ALL OTHERS:"
echo "   Access: DENIED"
echo "   Any unknown credentials will be blocked"
