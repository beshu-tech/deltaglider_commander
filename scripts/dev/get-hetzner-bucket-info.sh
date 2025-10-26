#!/bin/bash
# Script to retrieve and display all bucket metadata and policies from Hetzner S3

set -e  # Exit on error

# Hetzner S3 Configuration
export AWS_ACCESS_KEY_ID="MD61KMA143ET3MPVQ5HR"
export AWS_SECRET_ACCESS_KEY="2ydqTSZSLcyWHRbnjud6zpZsqDmsVzPqKwSqmAz2"
ENDPOINT="https://fsn1.your-objectstorage.com"
BUCKET="ror-builds-xdelta"
REGION="fsn1"

echo "=========================================="
echo "Hetzner S3 Bucket Metadata & Policies"
echo "=========================================="
echo "Endpoint: $ENDPOINT"
echo "Bucket: $BUCKET"
echo "Access Key: ${AWS_ACCESS_KEY_ID:0:8}..."
echo "Region: $REGION"
echo ""

# 1. Get Bucket Policy
echo "1. Bucket Policy:"
echo "-------------------------------------------"
if aws s3api get-bucket-policy \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1 | tee /tmp/bucket-policy.json; then
    echo ""
    echo "✅ Successfully retrieved bucket policy"
    if [ -f /tmp/bucket-policy.json ]; then
        echo "Policy saved to: /tmp/bucket-policy.json"
    fi
else
    ERROR_CODE=$?
    echo ""
    echo "⚠️  Could not retrieve bucket policy (may not exist or no permission)"
    echo "Error code: $ERROR_CODE"
fi
echo ""

# 2. Get Bucket ACL
echo "2. Bucket ACL (Access Control List):"
echo "-------------------------------------------"
if aws s3api get-bucket-acl \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1 | tee /tmp/bucket-acl.json; then
    echo ""
    echo "✅ Successfully retrieved bucket ACL"
    if [ -f /tmp/bucket-acl.json ]; then
        echo "ACL saved to: /tmp/bucket-acl.json"
    fi
else
    echo ""
    echo "⚠️  Could not retrieve bucket ACL"
fi
echo ""

# 3. Get Bucket Location
echo "3. Bucket Location:"
echo "-------------------------------------------"
if aws s3api get-bucket-location \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"; then
    echo ""
    echo "✅ Successfully retrieved bucket location"
else
    echo ""
    echo "⚠️  Could not retrieve bucket location"
fi
echo ""

# 4. Get Bucket Versioning
echo "4. Bucket Versioning:"
echo "-------------------------------------------"
if aws s3api get-bucket-versioning \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"; then
    echo ""
    echo "✅ Successfully retrieved bucket versioning status"
else
    echo ""
    echo "⚠️  Could not retrieve bucket versioning"
fi
echo ""

# 5. Get Bucket CORS
echo "5. Bucket CORS Configuration:"
echo "-------------------------------------------"
if aws s3api get-bucket-cors \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1; then
    echo ""
    echo "✅ Successfully retrieved bucket CORS"
else
    echo ""
    echo "⚠️  No CORS configuration or no permission to retrieve"
fi
echo ""

# 6. Get Bucket Lifecycle
echo "6. Bucket Lifecycle Configuration:"
echo "-------------------------------------------"
if aws s3api get-bucket-lifecycle-configuration \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1; then
    echo ""
    echo "✅ Successfully retrieved bucket lifecycle"
else
    echo ""
    echo "⚠️  No lifecycle configuration or no permission to retrieve"
fi
echo ""

# 7. Get Bucket Encryption
echo "7. Bucket Encryption Configuration:"
echo "-------------------------------------------"
if aws s3api get-bucket-encryption \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1; then
    echo ""
    echo "✅ Successfully retrieved bucket encryption"
else
    echo ""
    echo "⚠️  No encryption configuration or no permission to retrieve"
fi
echo ""

# 8. Get Bucket Tagging
echo "8. Bucket Tags:"
echo "-------------------------------------------"
if aws s3api get-bucket-tagging \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1; then
    echo ""
    echo "✅ Successfully retrieved bucket tags"
else
    echo ""
    echo "⚠️  No tags or no permission to retrieve"
fi
echo ""

# 9. Head Bucket (basic info)
echo "9. Bucket Head Info:"
echo "-------------------------------------------"
if aws s3api head-bucket \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>&1; then
    echo "✅ Bucket exists and is accessible"
else
    echo "⚠️  Cannot access bucket head info"
fi
echo ""

# 10. List first few objects to verify read access
echo "10. Sample Objects (first 10):"
echo "-------------------------------------------"
if aws s3api list-objects-v2 \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" \
    --max-items 10; then
    echo ""
    echo "✅ Successfully listed objects"
else
    echo ""
    echo "⚠️  Cannot list objects"
fi
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Retrieved metadata files saved to /tmp/:"
ls -lh /tmp/bucket-*.json 2>/dev/null || echo "No policy/ACL files saved"
echo ""
echo "To modify bucket policy, you'll need s3:PutBucketPolicy permission."
echo "Check if your current credentials have this permission."
