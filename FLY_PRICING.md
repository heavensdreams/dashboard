# Fly.io Pricing Guide

## Your Configuration

- **1 VM**: 256MB RAM, shared CPU, 1 vCPU
- **1 Volume**: 10GB (or minimum size)
- **Region**: cdg (Paris, France)

## Pricing Breakdown

### Free Tier Allowances

Fly.io provides **free allowances** that may cover your needs:

- **3 shared-cpu-1x VMs** (256MB RAM each) - **FREE**
- **3GB total persistent volume storage** - **FREE**
- **160GB outbound data transfer** - **FREE**

### Your Usage vs Free Tier

| Resource | Your Need | Free Allowance | Cost |
|----------|-----------|----------------|------|
| VMs (256MB) | 1 | 3 | **FREE** ✅ |
| Volume (10GB) | 10GB | 3GB total | **$0.15/GB/month** for 7GB over free tier = **$1.05/month** |
| Data Transfer | ~minimal | 160GB | **FREE** ✅ |

### If You Use 1GB Volume (Within Free Tier)

| Resource | Your Need | Free Allowance | Cost |
|----------|-----------|----------------|------|
| VMs (256MB) | 1 | 3 | **FREE** ✅ |
| Volume (1GB) | 1GB | 3GB total | **FREE** ✅ |
| Data Transfer | ~minimal | 160GB | **FREE** ✅ |

**Total: $0/month** 🎉

## Pricing Details

### VM Pricing (if over free tier)
- **Shared CPU (256MB)**: $1.94/month per VM
- **Dedicated CPU (256MB)**: $5.70/month per VM

### Volume Pricing
- **$0.15/GB/month** for storage over the 3GB free tier
- Minimum volume size: **1GB**
- Example: 10GB volume = 7GB over free tier = **$1.05/month**

### Data Transfer
- **160GB/month outbound** - FREE
- **Inbound data** - FREE
- Over 160GB: $0.02/GB

## Recommended Setup

### Option 1: Minimal Cost (Within Free Tier)
```toml
[compute]
  memory_mb = 256
  cpu_kind = 'shared'
  cpus = 1
```

Create **1GB volume** (within 3GB free tier):
```bash
fly volumes create data_volume --region cdg --size 1
```

**Cost: $0/month** ✅

### Option 2: 10GB Volume (Small Cost)
```bash
fly volumes create data_volume --region cdg --size 10
```

**Cost: ~$1.05/month** (7GB over free tier × $0.15)

## How to Check Your Current Usage

```bash
# Check your account usage
flyctl dashboard

# List your volumes
flyctl volumes list

# Check VM count
flyctl status
```

## How to Run flyctl Commands

### Setup (One Time)

1. **Install flyctl** (if not already):
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Add to PATH** (add to ~/.bashrc):
   ```bash
   export FLYCTL_INSTALL="$HOME/.fly"
   export PATH="$FLYCTL_INSTALL/bin:$PATH"
   ```

3. **Login**:
   ```bash
   flyctl auth login
   ```

### Common Commands

```bash
# Check if logged in
flyctl auth whoami

# List all apps
flyctl apps list

# Check app status
flyctl status --app dubairealestate

# View logs
flyctl logs --app dubairealestate

# Deploy app
flyctl deploy --app dubairealestate

# List volumes
flyctl volumes list --app dubairealestate

# Create volume (1GB - within free tier)
flyctl volumes create data_volume --region cdg --size 1 --app dubairealestate

# SSH into machine
flyctl ssh console --app dubairealestate

# Scale to 1 machine
flyctl scale count 1 --app dubairealestate

# Open app in browser
flyctl open --app dubairealestate
```

### Update fly.toml for Single Machine

To ensure exactly 1 machine:

```toml
[http_service]
  min_machines_running = 1  # Always keep 1 running

[compute]
  memory_mb = 256
  cpu_kind = 'shared'
  cpus = 1
```

## Cost Summary

### Best Case (1GB Volume)
- **1 VM (256MB)**: FREE (within 3 VM free tier)
- **1 Volume (1GB)**: FREE (within 3GB free tier)
- **Total: $0/month** 🎉

### Realistic Case (10GB Volume)
- **1 VM (256MB)**: FREE (within 3 VM free tier)
- **1 Volume (10GB)**: $1.05/month (7GB over free tier)
- **Total: ~$1.05/month** 💰

## Payment Method

Even with free tier, Fly.io may require a **payment method** on file for:
- Going over free tier limits
- Creating volumes larger than 3GB total
- Using dedicated CPU

You can add a payment method at: https://fly.io/dashboard

## References

- Fly.io Pricing: https://fly.io/docs/about/pricing/
- Volume Pricing: https://fly.io/docs/reference/volumes/
- Free Tier: https://fly.io/docs/about/free-trial/

