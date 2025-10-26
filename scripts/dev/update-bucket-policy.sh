#!/bin/bash
# Script to update Hetzner S3 bucket policy to allow uploads

set -e

# Hetzner S3 Configuration
export AWS_ACCESS_KEY_ID="MD61KMA143ET3MPVQ5HR"
export AWS_SECRET_ACCESS_KEY="2ydqTSZSLcyWHRbnjud6zpZsqDmsVzPqKwSqmAz2"
ENDPOINT="https://fsn1.your-objectstorage.com"
BUCKET="ror-builds-xdelta"
REGION="fsn1"
POLICY_FILE="new-bucket-policy.json"

echo "=========================================="
echo "Update Hetzner S3 Bucket Policy"
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

echo "New Policy:"
echo "-------------------------------------------"
cat "$POLICY_FILE" | python3 -m json.tool
echo "-------------------------------------------"
echo ""

# Attempt to update the bucket policy
echo "Attempting to update bucket policy..."
if aws s3api put-bucket-policy \
    --bucket "$BUCKET" \
    --policy file://"$POLICY_FILE" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"; then
    echo ""
    echo "✅ Successfully updated bucket policy!"
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
    echo "❌ Failed to update bucket policy"
    echo "Error code: $ERROR_CODE"
    echo ""
    echo "Possible reasons:"
    echo "  1. Your credentials (MD61KMA143ET3MPVQ5HR) lack s3:PutBucketPolicy permission"
    echo "  2. Only the bucket owner can modify policies"
    echo "  3. The bucket has IAM restrictions preventing policy updates"
    echo ""
    echo "Solution: Use the Hetzner Cloud Console to update the policy:"
    echo "  1. Go to https://console.hetzner.cloud/"
    echo "  2. Navigate to Object Storage"
    echo "  3. Select bucket: $BUCKET"
    echo "  4. Update the bucket policy with the content from: $POLICY_FILE"
    exit 1
fi
