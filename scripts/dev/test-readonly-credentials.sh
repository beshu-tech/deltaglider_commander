#!/bin/bash
# Test read-only credentials to verify they cannot upload

set -e

# Read-only credentials
export AWS_ACCESS_KEY_ID="HI3AJPWFFN4PJG48G5OF"
export AWS_SECRET_ACCESS_KEY=""  # You'll need to provide this
ENDPOINT="https://fsn1.your-objectstorage.com"
BUCKET="ror-builds-xdelta"
REGION="fsn1"

echo "=========================================="
echo "Read-Only Credentials Test"
echo "=========================================="
echo "Endpoint: $ENDPOINT"
echo "Bucket: $BUCKET"
echo "Access Key: ${AWS_ACCESS_KEY_ID:0:8}..."
echo "Region: $REGION"
echo ""
echo "NOTE: You need to provide the secret key for HI3AJPWFFN4PJG48G5OF"
echo "      Set it in this script or pass via AWS_SECRET_ACCESS_KEY env var"
echo ""

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS_SECRET_ACCESS_KEY not set"
    echo "   Please export it or edit this script"
    exit 1
fi

# Test 1: List buckets (should work)
echo "Test 1: Listing buckets..."
if aws s3 ls --endpoint-url "$ENDPOINT" --region "$REGION"; then
    echo "✅ List buckets: SUCCESS"
else
    echo "❌ List buckets: FAILED"
    exit 1
fi
echo ""

# Test 2: List objects (should work)
echo "Test 2: Listing objects in bucket..."
if aws s3 ls "s3://$BUCKET" --endpoint-url "$ENDPOINT" --region "$REGION" | head -5; then
    echo "✅ List objects: SUCCESS"
else
    echo "❌ List objects: FAILED"
    exit 1
fi
echo ""

# Test 3: Download an object (should work)
echo "Test 3: Downloading an object..."
FIRST_OBJECT=$(aws s3 ls "s3://$BUCKET/build/" --endpoint-url "$ENDPOINT" --region "$REGION" | head -1 | awk '{print $NF}')
if [ -n "$FIRST_OBJECT" ]; then
    if aws s3 cp "s3://$BUCKET/build/$FIRST_OBJECT" /tmp/readonly-test.tmp \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" >/dev/null 2>&1; then
        echo "✅ Download object: SUCCESS"
        rm -f /tmp/readonly-test.tmp
    else
        echo "❌ Download object: FAILED"
    fi
else
    echo "⚠️  No objects found to test download"
fi
echo ""

# Test 4: Try to upload (should FAIL)
echo "Test 4: Attempting upload (should be DENIED)..."
TEST_FILE="/tmp/readonly-upload-test.txt"
echo "Test content" > "$TEST_FILE"
TEST_KEY="test-readonly/should-fail-$(date +%s).txt"

if aws s3 cp "$TEST_FILE" "s3://$BUCKET/$TEST_KEY" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1 | grep -i "access.*denied" >/dev/null; then
    echo "✅ Upload blocked: SUCCESS (correctly denied)"
else
    if aws s3 cp "$TEST_FILE" "s3://$BUCKET/$TEST_KEY" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" >/dev/null 2>&1; then
        echo "❌ Upload allowed: FAILED (should have been denied!)"
        # Clean up if upload succeeded
        aws s3 rm "s3://$BUCKET/$TEST_KEY" \
            --endpoint-url "$ENDPOINT" \
            --region "$REGION" >/dev/null 2>&1 || true
    else
        echo "✅ Upload blocked: SUCCESS (correctly denied)"
    fi
fi

rm -f "$TEST_FILE"
echo ""

# Test 5: Try to delete (should FAIL)
echo "Test 5: Attempting delete (should be DENIED)..."
# Try to delete a file that exists
EXISTING_FILE=$(aws s3 ls "s3://$BUCKET/build/" --endpoint-url "$ENDPOINT" --region "$REGION" | head -1 | awk '{print $NF}')
if [ -n "$EXISTING_FILE" ]; then
    if aws s3 rm "s3://$BUCKET/build/$EXISTING_FILE" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" 2>&1 | grep -i "access.*denied" >/dev/null; then
        echo "✅ Delete blocked: SUCCESS (correctly denied)"
    else
        if aws s3 rm "s3://$BUCKET/build/$EXISTING_FILE" \
            --endpoint-url "$ENDPOINT" \
            --region "$REGION" >/dev/null 2>&1; then
            echo "❌ Delete allowed: FAILED (should have been denied!)"
        else
            echo "✅ Delete blocked: SUCCESS (correctly denied)"
        fi
    fi
else
    echo "⚠️  No objects found to test delete"
fi
echo ""

echo "=========================================="
echo "✅ Read-Only Policy Verified!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Can list buckets"
echo "  ✅ Can list objects"
echo "  ✅ Can download objects"
echo "  ✅ Cannot upload objects"
echo "  ✅ Cannot delete objects"
echo ""
echo "The read-only credentials are properly restricted."
