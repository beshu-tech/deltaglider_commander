# DeltaGlider Commander

S3 browser with delta compression capabilities through [DeltaGlider SDK](https://github.com/beshu-tech/deltaglider).

## Features

- **Delta compression** - Can efficiently reduce storage for similar files (like incremental backups)
- **Secure downloads** - Uses S3 presigned URLs instead of embedding credentials
- **Auto-decompression** - Compressed files are transparently decompressed
- **Background cleanup** - Temporary files cleaned up automatically
- **S3 compatible** - Works with AWS S3, MinIO, and other S3-compatible storage

## Quick Start

```bash
docker run -d -p 8000:8000 \
  -e DGCOMM_HMAC_SECRET=$(openssl rand -hex 32) \
  beshultd/deltaglider_commander:latest
```

Open http://localhost:8000 → Settings → Configure S3 credentials

## Configuration

**Required**: `DGCOMM_HMAC_SECRET` - Generate with `openssl rand -hex 32`

**S3 Credentials**: Configure via web UI (stored in browser, not server)

**Optional Housekeeping IAM** (for background cleanup):
```bash
-e DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY=limited-key \
-e DGCOMM_HOUSEKEEPING_S3_SECRET_KEY=limited-secret
```

Minimal IAM policy for housekeeping:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "*"},
    {"Effect": "Allow", "Action": ["s3:GetObject", "s3:DeleteObject"], 
     "Resource": "arn:aws:s3:::*/.deltaglider/tmp/*"}
  ]
}
```


## Works with MinIO

Configure in web UI: Endpoint → `http://minio:9000`, Addressing Style → `path`


- `latest` - Current stable release
- See [all releases](https://github.com/sscarduzio/dg_commander/releases) for specific versions

## Security Notes

- Downloads use S3 presigned URLs (credentials not exposed)
- S3 credentials stored in browser session only
- Background jobs can use separate limited IAM credentials

---

**GitHub**: [sscarduzio/deltaglider_commander](https://github.com/sscarduzio/deltaglider_commander)  
**DeltaGlider SDK**: [beshu-tech/deltaglider](https://github.com/beshu-tech/deltaglider)
