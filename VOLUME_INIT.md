# Volume Initialization

## How It Works

When the app starts on Fly.io with a volume mounted at `/data`:

### 1. Data Initialization

If `/data/data.json` doesn't exist (empty volume):
- Server loads `.fly/default-data.json` from the Docker image
- Copies it to `/data/data.json` on the volume
- Your app starts with all your initial data (users, apartments, bookings, etc.)

### 2. Photos Initialization

If `/data/photos/` directory is empty:
- Server copies all photos from `.fly/default-photos/` 
- Photos are copied to `/data/photos/` on the volume
- Your app starts with all initial photos

### 3. Subsequent Runs

Once initialized:
- Data persists on the volume
- No re-initialization (won't overwrite existing data)
- All changes are saved to the volume

## Code Location

The initialization logic is in `server.js`:

```javascript
// In readData() function:
if (!fs.existsSync(dataFile)) {
  // Try to load default data from repo if on Fly.io
  const defaultDataPath = path.join(__dirname, '.fly', 'default-data.json')
  if (isFlyIO && fs.existsSync(defaultDataPath)) {
    // Load and copy default data
  }
}

// After directory creation:
if (isFlyIO && photos.length === 0) {
  // Copy default photos from repo
}
```

## Testing

To test with an empty volume:

1. **Create a new volume:**
   ```bash
   fly volumes create test_volume --region cdg --size 1
   ```

2. **Update fly.toml to use test volume temporarily**

3. **Deploy:**
   ```bash
   fly deploy
   ```

4. **Check logs:**
   ```bash
   fly logs
   ```
   
   You should see:
   - `📋 Loading default data.json from repo...`
   - `✅ Initialized with default data.json`
   - `📸 Copying default photos from repo...`
   - `✅ Copied X default photos`

## Important Notes

- **First run only**: Initialization happens only when files don't exist
- **No overwrite**: Won't overwrite existing data on the volume
- **Persistent**: Once initialized, data persists across deployments
- **Volume required**: This only works when a volume is mounted at `/data`

