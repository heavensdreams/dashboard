# Fly.io Deployment Guide

## Overview

This app is configured to deploy to Fly.io as a single unified server that:
- Serves the built React frontend (static files)
- Handles all API routes (`/api/*`)
- Serves photos from `/photos`
- Stores data in a persistent volume at `/data`

## Prerequisites

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly.io:**
   ```bash
   fly auth login
   ```

## Deployment Steps

### 1. Verify/Use Existing App

The app `dubai-real-estate` already exists on Fly.io. You can verify:

```bash
fly apps list
```

If you need to create it (shouldn't be necessary):
```bash
fly apps create dubai-real-estate
```

### 2. Create Persistent Volume

The app needs a persistent volume to store `data.json` and photos:

```bash
fly volumes create data_volume --region iad --size 10
```

**Note:** 
- `iad` is the region (Washington, D.C.). Change if needed.
- `10` is the size in GB. Adjust based on your needs.
- The volume will be mounted at `/data` automatically (configured in `fly.toml`)

### 3. Deploy

```bash
fly deploy
```

This will:
- Build the Docker image (frontend + backend)
- Push to Fly.io
- Deploy the app

### 4. Verify Deployment

```bash
# Check app status
fly status

# View logs
fly logs

# Open in browser
fly open
```

## Configuration

### App Name

Change the app name in `fly.toml`:
```toml
app = "your-app-name"
```

### Region

Change the region in `fly.toml`:
```toml
primary_region = "iad"  # Options: iad, ord, dfw, etc.
```

### Port

The app runs on port **8084** (configured in `fly.toml` and `server.js`).

### Environment Variables

Set environment variables:
```bash
fly secrets set NODE_ENV=production
fly secrets set DATA_DIR=/data
```

## Useful Commands

### View Logs
```bash
fly logs
fly logs --app dubai-real-estate
```

### SSH into Instance
```bash
fly ssh console
fly ssh console --app dubai-real-estate
```

### Scale
```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale memory 512

# Scale CPU
fly scale vm shared-cpu-1x
```

### View App Info
```bash
fly status
fly info
```

### Restart
```bash
fly apps restart dubai-real-estate
```

### View Metrics
```bash
fly metrics
```

## Data Persistence

- **Data file**: `/data/data.json` (persisted in volume)
- **Photos**: `/data/photos/` (persisted in volume)
- The volume is automatically mounted at `/data` (configured in `fly.toml`)

## Troubleshooting

### App won't start

1. Check logs:
   ```bash
   fly logs
   ```

2. SSH in and check:
   ```bash
   fly ssh console
   ls -la /data
   cat /data/data.json
   ```

### Data not persisting

1. Verify volume is mounted:
   ```bash
   fly ssh console
   mount | grep /data
   ```

2. Check volume exists:
   ```bash
   fly volumes list
   ```

### Build fails

1. Check Dockerfile locally:
   ```bash
   docker build -t test-build .
   ```

2. Check build logs:
   ```bash
   fly deploy --verbose
   ```

## Architecture

```
┌─────────────────────────────────┐
│      Fly.io Instance             │
│                                  │
│  ┌──────────────────────────┐   │
│  │   Unified Server.js       │   │
│  │   (Port 8084)             │   │
│  │                           │   │
│  │  • Serves / (React app)   │   │
│  │  • Handles /api/*         │   │
│  │  • Serves /photos/*       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │   Persistent Volume       │   │
│  │   /data                   │   │
│  │                           │   │
│  │  • data.json              │   │
│  │  • photos/                │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

## Cost Estimation

Fly.io free tier includes:
- 3 shared-cpu-1x VMs with 256MB RAM
- 3GB persistent volume storage
- 160GB outbound data transfer

For this app:
- **1 VM** (shared-cpu-1x, 256MB RAM) ≈ **$0** (free tier)
- **10GB volume** ≈ **$1.50/month** (after free 3GB)
- **Total**: ~$1.50/month (or free if using <3GB volume)

## Next Steps

After deployment:
1. Access your app at `https://dubai-real-estate.fly.dev`
2. Login with your admin credentials
3. Start using the app!

## Support

- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io

