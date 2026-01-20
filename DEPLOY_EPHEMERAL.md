# Deploying with Ephemeral Storage (No Volume)

## Current Configuration ✅

The app is configured to work **without a persistent volume**:

1. **Volume mount is commented out** in `fly.toml` (lines 57-61)
2. **Server.js automatically uses `/tmp/app-data`** if `/data` volume doesn't exist
3. **Data will be ephemeral** - lost on machine restart, but app will work

## Deployment Steps

### 1. Login to Fly.io

```bash
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
flyctl auth login
```

This will open a browser - complete the authentication there.

### 2. Verify Login

```bash
flyctl auth whoami
```

### 3. Deploy

```bash
cd /mnt/ramdisk/rental
flyctl deploy
```

## What to Expect

- ✅ App will deploy successfully (no volume required)
- ✅ App will start and be accessible
- ⚠️ Data stored in `/tmp/app-data` (ephemeral)
- ⚠️ Data will be **lost** when machine restarts
- ⚠️ You'll see a warning in logs: "using /tmp/app-data (ephemeral)"

## After Deployment

1. **Check app status:**
   ```bash
   flyctl status
   ```

2. **View logs:**
   ```bash
   flyctl logs
   ```

3. **Open app:**
   ```bash
   flyctl open
   ```
   Or visit: https://dubairealestate.fly.dev

## Important Notes

- **Ephemeral storage** = data lost on restart
- For production, you'll want persistent storage (volume)
- To add volume later: uncomment the mount in `fly.toml` and create volume

## Troubleshooting

If deployment fails:
- Check you're logged in: `flyctl auth whoami`
- Check app exists: `flyctl apps list`
- View logs: `flyctl logs`

