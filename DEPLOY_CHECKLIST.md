# Deployment Checklist

## Pre-Deployment

- [x] ✅ Unified `server.js` works for both local and Fly.io
- [x] ✅ Environment detection (Fly.io vs Local)
- [x] ✅ Volume mount configured in `fly.toml`
- [x] ✅ Dockerfile builds correctly
- [x] ✅ Data and photos stored in `/data` volume on Fly.io
- [x] ✅ Local development uses project root

## Deployment Steps

### 1. Verify App Exists
```bash
fly apps list
```
Should show `dubai-real-estate`

### 2. Check/Create Volume
```bash
# List volumes
fly volumes list

# If volume doesn't exist, create it:
fly volumes create data_volume --region iad --size 10
```

### 3. Build and Test Locally (Optional)
```bash
# Build frontend
npm run build

# Test production build locally
NODE_ENV=production PORT=8084 node server.js
```

### 4. Deploy
```bash
fly deploy
```

### 5. Initialize Data (First Time Only)
After first deployment, if data.json doesn't exist:

```bash
# SSH into the instance
fly ssh console

# Run initialization script
sh /app/.fly/init-data.sh

# Or manually create data.json:
cat > /data/data.json << 'EOF'
{
  "users": [],
  "groups": [],
  "apartments": [],
  "logs": []
}
EOF
```

### 6. Verify Deployment
```bash
# Check status
fly status

# View logs
fly logs

# Test health endpoint
curl https://dubai-real-estate.fly.dev/api/health

# Open in browser
fly open
```

## Data Migration (If Needed)

If you have existing local data to migrate:

```bash
# Copy data.json to Fly.io
fly sftp shell
put data.json /data/data.json

# Copy photos (if any)
# Note: You'll need to copy photos individually or use fly sftp
```

## Troubleshooting

### Check Volume Mount
```bash
fly ssh console
ls -lah /data/
cat /data/data.json
```

### Check Logs
```bash
fly logs
```

### Restart App
```bash
fly apps restart dubai-real-estate
```

### Scale Resources
```bash
# Check current resources
fly scale show

# Scale if needed
fly scale memory 512
fly scale count 1
```

## Environment Variables

Current setup uses:
- `PORT=8084` (set in fly.toml)
- `NODE_ENV=production` (set in fly.toml)
- `DATA_DIR=/data` (set in fly.toml)

No additional secrets needed for basic operation.

## Storage Locations

### Local Development
- **Data**: `./data.json` (project root)
- **Photos**: `./photos/` (project root)

### Fly.io Production
- **Data**: `/data/data.json` (persistent volume)
- **Photos**: `/data/photos/` (persistent volume)

Both are stored in the same volume for easy backup and migration.

