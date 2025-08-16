# Railway Deployment Guide

## Quick Start (5 minutes)

### 1. Connect GitHub Repository
```bash
# Push your code to GitHub if not already done
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Deploy on Railway
1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Next.js and start deployment

### 3. Add PostgreSQL Database
In Railway dashboard:
1. Click "+ New" → "Database" → "Add PostgreSQL"
2. Railway automatically sets `DATABASE_URL` environment variable

### 4. Configure Environment Variables
In Railway project settings → Variables:
```bash
# Required for app functionality
ANTHROPIC_API_KEY=sk-ant-api03-xxx
MISTRAL_API_KEY=xxx

# Optional AI providers
OPENAI_API_KEY=sk-proj-xxx
GOOGLE_API_KEY=xxx
PERPLEXITY_API_KEY=pplx-xxx

# Authentication (if using)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
AUTH_SECRET=xxx
AUTH_TRUST_HOST=true

# Email (if using)
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=xxx

# WebSocket URL (update after deployment)
NEXT_PUBLIC_WS_URL=wss://your-app.up.railway.app
```

### 5. Deploy Command
Railway will automatically run:
```bash
# Build
npm ci && npx prisma generate && npm run build

# Start (with migrations)
npx prisma migrate deploy && npm start
```

## File Storage Configuration

### Option 1: Railway Volumes (Recommended)
```bash
# In Railway dashboard:
1. Go to your service settings
2. Click "Volumes" → "New Volume"
3. Mount path: /app/uploads
4. Your uploads will persist across deployments
```

### Option 2: External Storage (Production)
Consider integrating:
- AWS S3
- Cloudinary
- Uploadthing
- Supabase Storage

## Monitoring & Logs

Railway provides:
- Real-time logs in dashboard
- Metrics (CPU, Memory, Network)
- Crash reports and restarts
- Custom domains support

## Production Checklist

- [ ] Set NODE_ENV=production in Railway
- [ ] Configure custom domain (optional)
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Add monitoring (Sentry, LogRocket)
- [ ] Set up SSL (automatic with Railway)

## Troubleshooting

### Database Connection Issues
```bash
# Railway provides DATABASE_URL automatically
# Format: postgresql://user:pass@host:port/dbname?schema=public
```

### Build Failures
```bash
# Check logs in Railway dashboard
# Common fixes:
- Ensure all dependencies in package.json
- Check Node version compatibility
- Verify environment variables set
```

### File Upload Issues
```bash
# If uploads fail, check:
- Volume mounted correctly
- Write permissions set
- File size limits configured
```

## Cost Estimates

Railway pricing (as of 2025):
- **Hobby**: $5/month (includes $5 usage)
- **Pro**: $20/month (includes $20 usage)
- **Database**: ~$5-10/month for small PostgreSQL
- **Total**: ~$10-15/month for this app

## Commands Reference

```bash
# Local testing before deploy
npm run build
npm start

# Database commands
npx prisma migrate dev    # Local development
npx prisma migrate deploy  # Production
npx prisma studio         # Database GUI

# Railway CLI (optional)
npm install -g @railway/cli
railway login
railway up  # Deploy from CLI
```

## Next Steps After Deployment

1. Test all features in production
2. Set up monitoring and error tracking
3. Configure backups
4. Add custom domain
5. Set up CI/CD pipeline (optional)