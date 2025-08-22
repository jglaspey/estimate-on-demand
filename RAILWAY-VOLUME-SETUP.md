# Railway Volume Setup for PDF Storage

## Problem
Railway containers are ephemeral - uploaded PDFs stored in the filesystem are lost when containers restart, causing extraction failures with "ENOENT: no such file or directory" errors.

## Solution: Railway Persistent Volume

### 1. Create Volume in Railway Dashboard

1. Go to your Railway project
2. Select your web service
3. Navigate to the "Volumes" tab
4. Click "Create Volume"
5. Configure:
   - **Mount path**: `/app/uploads`
   - **Size**: 1GB (can be increased later)
   - **Name**: uploads-volume

### 2. Add Environment Variable

In Railway service settings, add:
```
UPLOAD_DIR=/app/uploads
```

### 3. Deploy Changes

The code already uses `process.env.UPLOAD_DIR` if available, falling back to local uploads directory for development.

### 4. Verify

After deployment:
1. Upload a PDF through the UI
2. Check Railway logs for successful upload
3. Restart the service manually
4. Verify the PDF still loads correctly

## Alternative: S3 Storage (Future Enhancement)

For production scale, consider migrating to S3-compatible storage:
- Better reliability
- Automatic backups
- CDN support
- No size limits

See `DEPLOYMENT.md` for S3 implementation notes.

## Troubleshooting

If uploads still fail after volume setup:
1. Verify volume is mounted: Check Railway service settings
2. Verify path permissions: The app should have write access to `/app/uploads`
3. Check environment variable: Ensure `UPLOAD_DIR=/app/uploads` is set
4. Review logs: Look for mkdir or write permission errors
