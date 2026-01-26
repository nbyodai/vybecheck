# Quick Start: Deploy VybeCheck

## Ready to Deploy? Run These Commands

### 1. Install flyctl (if not installed)
```bash
brew install flyctl
# OR
curl -L https://fly.io/install.sh | sh
```

### 2. Deploy Backend to Fly.io
```bash
# Login
flyctl auth login

# Launch app (first time)
flyctl launch

# Deploy
flyctl deploy

# Get your URL
flyctl info
```

### 3. Deploy Frontend to Cloudflare Pages
```bash
# Install wrangler (if not installed)
npm install -g wrangler

# Login
wrangler login

# Create production env file with your Fly.io URL
echo "VITE_WS_URL=wss://YOUR-APP-NAME.fly.dev" > .env.production

# Build
npm run build:frontend

# Deploy
wrangler pages deploy dist --project-name=vybecheck
```

### 4. Test
Visit your Cloudflare Pages URL (shown after deployment) and start using VybeCheck!

---

## Full Documentation
See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete details, troubleshooting, and advanced configuration.
