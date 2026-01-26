# VybeCheck Deployment Guide

## Architecture
- **Backend (WebSocket + API)**: Fly.io
- **Frontend (Static Files)**: Cloudflare Pages

## Prerequisites
- Fly.io account (https://fly.io)
- Cloudflare account (https://cloudflare.com)
- flyctl CLI installed
- wrangler CLI installed

---

## Part 1: Deploy Backend to Fly.io

### 1. Install Fly.io CLI
```bash
# macOS
brew install flyctl

# Or using install script
curl -L https://fly.io/install.sh | sh
```

### 2. Login to Fly.io
```bash
flyctl auth login
```

### 3. Launch the app (first time only)
```bash
flyctl launch
```

When prompted:
- App name: `vybecheck` (or your preferred name)
- Region: Choose closest to your users
- PostgreSQL database: **No**
- Redis database: **No**

### 4. Deploy
```bash
flyctl deploy
```

### 5. Get your Fly.io URL
```bash
flyctl info
```

Copy the hostname (e.g., `vybecheck.fly.dev`)

### 6. Verify deployment
```bash
# Check status
flyctl status

# View logs
flyctl logs

# Test health endpoint
curl https://vybecheck.fly.dev/health
```

---

## Part 2: Deploy Frontend to Cloudflare Pages

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Create .env.production file
```bash
echo "VITE_WS_URL=wss://vybecheck.fly.dev" > .env.production
```

Replace `vybecheck.fly.dev` with your actual Fly.io hostname.

### 4. Build frontend with production config
```bash
npm run build:frontend
```

### 5. Deploy to Cloudflare Pages
```bash
wrangler pages deploy dist --project-name=vybecheck
```

### 6. Get your Cloudflare Pages URL
The command will output your URL, e.g., `https://vybecheck.pages.dev`

---

## Part 3: Configure CORS (if needed)

If you get CORS errors, update `src/server.ts`:

```typescript
import cors from 'cors';

app.use(cors({
  origin: 'https://vybecheck.pages.dev', // Your Cloudflare Pages URL
  credentials: true
}));
```

Then:
```bash
npm install cors @types/cors
flyctl deploy
```

---

## Environment Variables

### Local Development (.env)
```
VITE_WS_URL=ws://localhost:3000
```

### Production (.env.production)
```
VITE_WS_URL=wss://vybecheck.fly.dev
```

---

## Scaling on Fly.io

### Auto-scaling (default)
Fly.io will automatically scale your app based on traffic.

### Manual scaling
```bash
# Set number of machines
flyctl scale count 2

# Set VM size
flyctl scale vm shared-cpu-1x

# Set memory
flyctl scale memory 512
```

---

## Monitoring

### Fly.io
```bash
# View logs
flyctl logs

# View metrics
flyctl status

# SSH into machine
flyctl ssh console
```

### Cloudflare Pages
- Dashboard: https://dash.cloudflare.com/pages
- Analytics available in dashboard

---

## Updating

### Backend
```bash
# Make changes to code
# Then deploy
flyctl deploy
```

### Frontend
```bash
# Build
npm run build:frontend

# Deploy
wrangler pages deploy dist --project-name=vybecheck
```

---

## Costs

### Fly.io Free Tier
- 3 shared-cpu-1x 256mb VMs
- 160GB bandwidth
- Sufficient for testing and small apps

### Cloudflare Pages Free Tier
- Unlimited static requests
- 500 builds/month
- Perfect for frontend hosting

---

## Custom Domain

### Fly.io
```bash
flyctl certs create yourdomain.com
flyctl certs show yourdomain.com
```

Add the DNS records shown in your domain registrar.

### Cloudflare Pages
- Add custom domain in Cloudflare Pages dashboard
- DNS automatically configured if using Cloudflare DNS

---

## Troubleshooting

### WebSocket connection fails
1. Check Fly.io logs: `flyctl logs`
2. Verify URL uses `wss://` (not `ws://`)
3. Check CORS settings
4. Verify Fly.io app is running: `flyctl status`

### Frontend not updating
1. Clear build cache: `rm -rf dist`
2. Rebuild: `npm run build:frontend`
3. Check .env.production has correct URL
4. Redeploy: `wrangler pages deploy dist --project-name=vybecheck`

### Build fails on Fly.io
1. Check Dockerfile syntax
2. Verify package.json scripts work locally
3. Check build logs: `flyctl logs`
