# Volume Setup for Fly.io

## Error
```
Error: Process group 'app' needs volumes with name 'data_volume' to fulfill mounts defined in fly.toml
Run `fly volume create data_volume -r REGION -n COUNT` for the following regions and counts: cdg=2
```

## Solution

You need to create the persistent volume in the `cdg` region (Paris, France).

### Create Volume

```bash
# Create volume in cdg region (10GB size)
fly volumes create data_volume --region cdg --size 10
```

### If You Need Multiple Volumes (for multiple machines)

If you're running 2 machines and each needs its own volume:

```bash
# Create 2 volumes (one per machine)
fly volumes create data_volume --region cdg --size 10 --count 2
```

### Check Existing Volumes

```bash
# List all volumes
fly volumes list

# List volumes for this app
fly volumes list --app dubairealestate
```

## Current Configuration

- **Volume name**: `data_volume`
- **Region**: `cdg` (Paris, France)
- **Mount point**: `/data`
- **Stores**: `data.json` and `photos/`

## After Creating Volume

Once the volume is created, deploy again:

```bash
fly deploy
```

The volume will be automatically mounted at `/data` and your app will use it for persistent storage.

