# Deployment Guide: Vercel + Custom Domain

This guide will help you deploy the Cross-Chain USDC Transfer application to Vercel with your custom domain `crosschain.thosoft.xyz`.

## Prerequisites

- GitHub account with the repository pushed: ✅ Done
- Vercel account (free tier works fine)
- Access to your domain DNS settings at thosoft.xyz
- A Solana RPC provider API key (Alchemy, Helius, or QuickNode)

## Step 1: Get Your Solana RPC API Key

### Option A: Alchemy (Recommended)
1. Go to [Alchemy](https://www.alchemy.com/)
2. Sign up for a free account
3. Create a new app:
   - Chain: Solana
   - Network: Mainnet
4. Copy your API key from the dashboard
5. Your URL will look like: `https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY`

### Option B: Helius
1. Go to [Helius](https://www.helius.dev/)
2. Sign up and create a new project
3. Get your RPC URL from the dashboard

### Option C: QuickNode
1. Go to [QuickNode](https://www.quicknode.com/)
2. Create a Solana Mainnet endpoint
3. Copy your HTTP Provider URL

## Step 2: Deploy to Vercel

### 2.1 Import Your Repository

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - Search for: `NumberZeros/cross-chain-cirle`
   - Click **"Import"**

### 2.2 Configure Build Settings

Vercel should auto-detect the settings from `vercel.json`, but verify:

- **Framework Preset**: Vite
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install --frozen-lockfile`

### 2.3 Add Environment Variables

Before deploying, add your environment variable:

1. In the Vercel project setup, scroll to **"Environment Variables"**
2. Add the following:
   - **Name**: `VITE_SOLANA_MAINNET_RPC_URL`
   - **Value**: Your Alchemy/Helius/QuickNode RPC URL (from Step 1)
   - **Environments**: Select all (Production, Preview, Development)

Example:
```
VITE_SOLANA_MAINNET_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY_HERE
```

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-3 minutes)
3. Your app will be live at a temporary Vercel URL like: `https://cross-chain-cirle-xyz.vercel.app`

## Step 3: Add Custom Domain

### 3.1 Add Domain in Vercel

1. Go to your project **Settings** → **Domains**
2. Click **"Add"**
3. Enter: `crosschain.thosoft.xyz`
4. Click **"Add"**

Vercel will show you DNS records to configure.

### 3.2 Configure DNS Records

You'll need to add one of these configurations to your DNS provider:

#### Option A: CNAME Record (Recommended if subdomain)
```
Type:  CNAME
Name:  crosschain
Value: cname.vercel-dns.com
TTL:   Auto or 3600
```

#### Option B: A Record (If you prefer)
```
Type:  A
Name:  crosschain
Value: 76.76.21.21
TTL:   Auto or 3600
```

**Where to add these records:**
- Log in to your domain registrar (where you bought thosoft.xyz)
- Go to DNS settings
- Add the record as shown above
- Save changes

### 3.3 Verify Domain

1. Back in Vercel, click **"Refresh"** on the domain page
2. Once DNS propagates (can take 5-60 minutes), status will show **"Valid"**
3. Vercel will automatically provision an SSL certificate
4. Your app will be live at: `https://crosschain.thosoft.xyz` 🎉

## Step 4: Enable Automatic Deployments

Vercel automatically deploys when you push to `main`:

1. Every push to `main` branch triggers a new deployment
2. Preview deployments are created for pull requests
3. You can roll back to previous deployments from the Vercel dashboard

## Step 5: Production Checklist

Before going live, verify:

- ✅ Custom domain is working with HTTPS
- ✅ Environment variable is set correctly
- ✅ Test a small transfer on mainnet (start with $1-5 USDC)
- ✅ Try connecting both EVM wallets (MetaMask) and Solana wallets (Phantom)
- ✅ Test recovery mode with a transaction hash
- ✅ Check all supported chains work (Ethereum, Polygon, Arbitrum, Base, Solana)

## Monitoring & Maintenance

### View Logs
- Vercel Dashboard → Your Project → **Deployments** → Click any deployment → **Function Logs**

### View Analytics
- Vercel Dashboard → Your Project → **Analytics**
- Shows page views, unique visitors, top pages

### Update Environment Variables
1. Settings → **Environment Variables**
2. Edit or add new variables
3. **Important**: After changing environment variables, you must redeploy:
   - Go to **Deployments**
   - Click the three dots on the latest deployment
   - Click **"Redeploy"**

## Troubleshooting

### Build Fails
- Check the build logs in Vercel
- Verify `pnpm-lock.yaml` is committed
- Ensure Node.js version is compatible (Vercel uses Node 20.x by default)

### Environment Variable Not Working
- Verify the variable name starts with `VITE_`
- After adding/changing variables, trigger a new deployment
- Check browser console for "undefined" RPC URL

### Domain Not Resolving
- Wait up to 24 hours for DNS propagation (usually 5-60 minutes)
- Use [DNS Checker](https://dnschecker.org/) to verify propagation
- Verify CNAME/A record is configured correctly
- Clear your browser cache

### RPC Rate Limiting
- Free tier RPCs have rate limits
- Upgrade to a paid plan if you get rate limit errors
- Consider using multiple RPC providers with failover

## Cost Estimates

### Vercel
- **Free Tier**: Perfect for this app
  - 100GB bandwidth/month
  - 6,000 build minutes/month
  - Automatic HTTPS
  - **Cost**: $0

### RPC Provider (Alchemy example)
- **Free Tier**: 
  - 300M compute units/month
  - ~300,000 requests/month
  - **Cost**: $0
- **Growth Plan**: $49/month for higher limits

### Total Monthly Cost
- For low to moderate traffic: **$0**
- For high traffic: $0 (Vercel) + $49 (RPC) = **$49/month**

## Security Reminders

🔐 **Never commit these to git:**
- `.env` file
- API keys
- Private keys
- Database credentials

✅ **Always use:**
- Environment variables in Vercel dashboard
- HTTPS only (automatic with Vercel)
- Separate API keys for dev/staging/prod

## Support

If you encounter issues:
1. Check Vercel logs for errors
2. Review this guide step-by-step
3. Check the main [README.md](README.md) for project details
4. Open an issue on GitHub: https://github.com/NumberZeros/cross-chain-cirle/issues

---

**Deployment Complete! 🚀**

Your Cross-Chain USDC Transfer app is now live at:
- Production: https://crosschain.thosoft.xyz
- GitHub: https://github.com/NumberZeros/cross-chain-cirle
