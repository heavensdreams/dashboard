# Fly.io Deployment Guide

## Prerequisites

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:
   ```bash
   fly auth login
   ```

## Deployment Steps

1. **Verify existing app:**
   ```bash
   fly apps list
   ```
   The app `dubai-real-estate` should already exist. If not, create it:
   ```bash
   fly apps create dubai-real-estate
   ```

2. **Create persistent volume (if not exists):**
   ```bash
   fly volumes create data_volume --region iad --size 10
   ```

3. **Deploy:**
   ```bash
   fly deploy
   ```

## Useful Commands

- View logs: `fly logs`
- SSH: `fly ssh console`
- Scale: `fly scale count 2`
- Secrets: `fly secrets set KEY=value`
