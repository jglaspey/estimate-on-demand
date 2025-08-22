# Deployment Architecture

## Railway Hosting Strategy

### Service Configuration

**Web Service** (Primary)
- **Runtime**: Next.js on Node.js 22
- **Purpose**: Serves UI + API routes + WebSockets
- **Settings**: Sleep disabled, fixed small size, no autoscaling

**Worker Service** (Background Processing)
- **Runtime**: Node.js 22 with BullMQ
- **Purpose**: PDF parsing and Claude API calls
- **Settings**: Sleep disabled, fixed small size, no autoscaling

### Managed Services

**PostgreSQL Database**
- Stores job data, rule analysis, user decisions
- JSONB columns for extracted roof measurements
- Full-text search capabilities for document content

**Redis Cache**
- BullMQ job queue management
- WebSocket session management
- Temporary file processing cache

### Storage Strategy

**Option A: Railway Volume**
- Mount volume to `/uploads` directory
- 1GB initial allocation, expandable
- Simple local file storage

**Option B: S3-Compatible Storage**
- More scalable for production
- Automatic backup/versioning
- CDN integration potential

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI Services
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx (backup)

# Authentication (see USER-AUTH-GUIDANCE.md for complete setup)
AUTH_SECRET=xxx (32+ chars)
AUTH_TRUST_HOST=true
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=xxx
ALLOWED_GOOGLE_DOMAIN=client.com (optional)

# App Configuration
NEXT_PUBLIC_WS_URL=wss://your-app.railway.app
NODE_ENV=production
UPLOAD_DIR=/app/uploads  # Must match Railway volume mount path
```

**Authentication Implementation**: See `USER-AUTH-GUIDANCE.md` for complete Auth.js v5 + Prisma + invite-only onboarding setup.

### Deployment Checklist

- [ ] Configure PostgreSQL with proper schema
- [ ] Set up Redis for BullMQ queues
- [ ] Deploy web service with WebSocket support
- [ ] Deploy worker service for background jobs
- [ ] Configure environment variables
- [ ] Test PDF upload → analysis → report workflow
- [ ] Monitor performance and error rates

### Scaling Considerations

**Current Setup**: Fixed small instances (development/testing)
**Future Options**: 
- Enable autoscaling for high-volume periods
- Add multiple worker instances for parallel processing
- Implement CDN for static assets and generated reports

---

**Key Advantage**: Railway's managed services eliminate infrastructure complexity while maintaining production reliability.