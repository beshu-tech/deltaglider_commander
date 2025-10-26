#!/bin/bash
# Test script to verify Hetzner S3 credentials and permissions

set -e  # Exit on error

# Hetzner S3 Configuration
export AWS_ACCESS_KEY_ID="MD61KMA143ET3MPVQ5HR"
export AWS_SECRET_ACCESS_KEY="2ydqTSZSLcyWHRbnjud6zpZsqDmsVzPqKwSqmAz2"
ENDPOINT="https://fsn1.your-objectstorage.com"
BUCKET="ror-builds-xdelta"
REGION="fsn1"

echo "=========================================="
echo "Hetzner S3 Credentials Test"
echo "=========================================="
echo "Endpoint: $ENDPOINT"
echo "Bucket: $BUCKET"
echo "Access Key: ${AWS_ACCESS_KEY_ID:0:8}..."
echo "Region: $REGION"
echo ""

# Test 1: List buckets
echo "Test 1: Listing buckets..."
if aws s3 ls --endpoint-url "$ENDPOINT" --region "$REGION"; then
    echo "✅ Successfully listed buckets"
else
    echo "❌ Failed to list buckets"
    exit 1
fi
echo ""

# Test 2: List objects in the specific bucket
echo "Test 2: Listing objects in bucket '$BUCKET'..."
if aws s3 ls "s3://$BUCKET" --endpoint-url "$ENDPOINT" --region "$REGION"; then
    echo "✅ Successfully listed objects in bucket"
else
    echo "❌ Failed to list objects in bucket"
    exit 1
fi
echo ""

# Test 3: Create a test file
TEST_FILE="/tmp/hetzner-s3-test-$(date +%s).txt"
echo "This is a test file created at $(date)" > "$TEST_FILE"
echo "Test 3: Creating test file: $TEST_FILE"
echo "✅ Test file created"
echo ""

# Test 4: Upload test file
TEST_KEY="test-uploads/test-$(date +%s).txt"
echo "Test 4: Uploading test file to s3://$BUCKET/$TEST_KEY..."
if aws s3 cp "$TEST_FILE" "s3://$BUCKET/$TEST_KEY" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"; then
    echo "✅ Successfully uploaded file"
else
    echo "❌ Failed to upload file"
    echo ""
    echo "Trying with --debug flag for more info..."
    aws s3 cp "$TEST_FILE" "s3://$BUCKET/$TEST_KEY" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" \
        --debug 2>&1 | tail -50
    exit 1
fi
echo ""

# Test 5: Verify uploaded file exists
echo "Test 5: Verifying uploaded file exists..."
if aws s3 ls "s3://$BUCKET/$TEST_KEY" --endpoint-url "$ENDPOINT" --region "$REGION"; then
    echo "✅ File exists in bucket"
else
    echo "❌ File not found in bucket"
    exit 1
fi
echo ""

# Test 6: Download the file back
DOWNLOAD_FILE="/tmp/hetzner-s3-download-$(date +%s).txt"
echo "Test 6: Downloading file back to $DOWNLOAD_FILE..."
if aws s3 cp "s3://$BUCKET/$TEST_KEY" "$DOWNLOAD_FILE" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"; then
    echo "✅ Successfully downloaded file"
else
    echo "❌ Failed to download file"
    exit 1
fi
echo ""

# Test 7: Verify content matches
echo "Test 7: Verifying content matches..."
if diff "$TEST_FILE" "$DOWNLOAD_FILE"; then
    echo "✅ File content matches"
else
    echo "❌ File content mismatch"
    exit 1
fi
echo ""

# Test 8: Delete test file from S3
echo "Test 8: Cleaning up - deleting test file from S3..."
if aws s3 rm "s3://$BUCKET/$TEST_KEY" --endpoint-url "$ENDPOINT" --region "$REGION"; then
    echo "✅ Successfully deleted test file"
else
    echo "❌ Failed to delete test file"
    exit 1
fi
echo ""

# Cleanup local files
rm -f "$TEST_FILE" "$DOWNLOAD_FILE"
echo "✅ Cleaned up local test files"
echo ""

echo "=========================================="
echo "✅ ALL TESTS PASSED!"
echo "=========================================="
echo ""
echo "Your Hetzner S3 credentials are working correctly."
echo "The issue with DeltaGlider Commander may be:"
echo "  1. Different credentials configured in the app"
echo "  2. Different endpoint URL format"
echo "  3. Missing 'addressing_style': 'path' setting"
echo "  4. Session credential issues"
echo ""
echo "Recommended settings for DeltaGlider Commander:"
echo "{"
echo "  \"access_key_id\": \"$AWS_ACCESS_KEY_ID\","
echo "  \"secret_access_key\": \"$AWS_SECRET_ACCESS_KEY\","
echo "  \"endpoint\": \"$ENDPOINT\","
echo "  \"region\": \"$REGION\","
echo "  \"addressing_style\": \"path\""
echo "}"
