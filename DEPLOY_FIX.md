# Deployment Fix

## Issue
Fly.io couldn't find the Dockerfile during deployment.

## Solution Applied

1. ✅ Verified Dockerfile exists and is tracked in git
2. ✅ Verified fly.toml references Dockerfile correctly
3. ✅ Added explicit `builder = "docker"` to fly.toml
4. ✅ Ensured all files are committed and pushed

## Deployment Command

Use this command (not `fly launch`):

```bash
fly deploy
```

**Important**: If you're using the Fly.io web interface or `fly launch`, make sure:
- The repository is connected correctly
- The Dockerfile is in the root directory (✅ it is)
- The fly.toml is in the root directory (✅ it is)

## Alternative: Manual Deploy

If automatic detection still fails:

```bash
# 1. Clone the repo (if deploying from different machine)
git clone git@github.com:AndreyKozlov1984/DubaiRealEstate.git
cd DubaiRealEstate

# 2. Deploy with explicit Dockerfile
fly deploy --dockerfile Dockerfile

# Or use the existing fly.toml
fly deploy
```

## Verify Files

```bash
# Check files exist
ls -la Dockerfile fly.toml

# Check they're in git
git ls-files | grep -E "(Dockerfile|fly.toml)"

# Verify Dockerfile content
head -5 Dockerfile
```

## Current Status

- ✅ Dockerfile: Present in root, 52 lines
- ✅ fly.toml: Present in root, references Dockerfile
- ✅ Both files: Committed to git
- ✅ Builder: Explicitly set to "docker"

The deployment should work now!

