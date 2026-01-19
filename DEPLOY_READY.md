# ✅ Deployment Ready!

## What's Configured

### ✅ Environment Detection
- **Local**: Uses `./data.json` and `./photos/` (project root)
- **Fly.io**: Uses `/data/data.json` and `/data/photos/` (persistent volume)

### ✅ Volume Configuration
- Volume name: `data_volume`
- Mount point: `/data`
- Stores: `data.json` + all photos
- Region: `iad` (Washington, D.C.)

### ✅ Server Configuration
- **Port**: 8084 (Fly.io), 8083 (local dev)
- **Environment**: Auto-detects Fly.io vs Local
- **Frontend**: Serves static files in production, API-only in dev

## Quick Deploy

```bash
# 1. Verify app exists
fly apps list

# 2. Check/create volume
fly volumes list
# If needed: fly volumes create data_volume --region iad --size 10

# 3. Deploy!
fly deploy
```

## First-Time Setup

After deployment, initialize data if needed:

```bash
fly ssh console
sh /app/.fly/init-data.sh
```

Or manually:
```bash
fly ssh console
cat > /data/data.json << 'EOF'
{
  "users": [],
  "groups": [],
  "apartments": [],
  "logs": []
}
EOF
```

## Verify Deployment

```bash
# Check status
fly status

# View logs
fly logs

# Test health
curl https://dubai-real-estate.fly.dev/api/health

# Open app
fly open
```

## Data Storage

### Local Development
```
/mnt/ramdisk/rental/
├── data.json          ← Local data
└── photos/            ← Local photos
    ├── photo1.jpg
    └── photo2.jpg
```

### Fly.io Production
```
/data/                 ← Persistent volume
├── data.json          ← All app data
└── photos/            ← All uploaded photos
    ├── photo1.jpg
    └── photo2.jpg
```

**Both data.json and photos are stored in the same volume for easy backup!**

## Migration (If Needed)

To copy local data to Fly.io:

```bash
# Copy data.json
fly sftp shell
put data.json /data/data.json

# Copy photos (one by one or use tar)
# Note: Use fly sftp or fly ssh for file transfer
```

## All Set! 🚀

The app is ready to deploy. Everything is configured:
- ✅ Unified server.js (works locally and on Fly.io)
- ✅ Volume mount configured
- ✅ Environment detection
- ✅ Data persistence
- ✅ Photo storage
- ✅ Initialization script

Just run `fly deploy`!

