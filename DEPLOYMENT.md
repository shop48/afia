# Neoa Marketplace — Deployment Guide

Complete deployment reference for the Neoa escrow marketplace.

---

## Architecture

```
GitHub (Push to main)
  ├── .github/workflows/deploy-api.yml  → Cloudflare Workers (Backend)
  └── .github/workflows/deploy-web.yml  → Cloudflare Pages  (Frontend)
                                              │
                                    Supabase (Database + Auth)
```

---

## Prerequisites

1. **Cloudflare Account** — [dash.cloudflare.com](https://dash.cloudflare.com)
2. **GitHub Repository** — Push the project to GitHub
3. **Supabase Project** — Already live: `cviwaycytjghpjzndode`

---

## Step 1: Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a token with:
   - **Workers Scripts**: Edit
   - **Pages**: Edit
   - **Account Settings**: Read
3. Copy the token and your **Account ID** (from the dashboard sidebar)

---

## Step 2: Configure GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions** and add:

### Required Secrets

| Secret Name | Where to Get It | Used By |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Step 1 above | Both workflows |
| `CLOUDFLARE_ACCOUNT_ID` | CF Dashboard sidebar | Both workflows |
| `SUPABASE_URL` | `https://cviwaycytjghpjzndode.supabase.co` | API + Web |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API | API + Web |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API (service_role) | API only |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard | API only |
| `PAYSTACK_PUBLIC_KEY` | Paystack Dashboard | Web only |
| `FRONTEND_URL` | Your Pages URL (e.g., `https://neoa-web.pages.dev`) | API only |
| `API_URL` | Your Workers URL (e.g., `https://neoa-api-production.workers.dev`) | Web only |
| `ADMIN_MASTER_PASSWORD` | Choose a strong password | API only |

### Optional Secrets (add when ready)

| Secret Name | Provider | Used By |
|---|---|---|
| `WISE_API_TOKEN` | [Wise Business](https://wise.com/business) | API |
| `WISE_PROFILE_ID` | Wise Dashboard → Settings | API |
| `WISE_WEBHOOK_SECRET` | Wise Dashboard → Webhooks | API |
| `SMILEID_PARTNER_ID` | [SmileID Portal](https://portal.smileidentity.com) | API |
| `SMILEID_API_KEY` | SmileID Portal | API |
| `SMILEID_WEBHOOK_SECRET` | SmileID Portal | API |
| `POSTHOG_KEY` | [PostHog](https://app.posthog.com) → Project Settings | Web |
| `POSTHOG_HOST` | Usually `https://us.i.posthog.com` | Web |
| `SENTRY_DSN` | [Sentry](https://sentry.io) → Project → Client Keys | Web |

---

## Step 3: First Deployment

### Backend (Cloudflare Workers)

```bash
cd afia-api
npm ci

# Set secrets (one-time per environment)
npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_KEY --env production
npx wrangler secret put SUPABASE_SERVICE_KEY --env production
npx wrangler secret put PAYSTACK_SECRET_KEY --env production
npx wrangler secret put FRONTEND_URL --env production
npx wrangler secret put ADMIN_MASTER_PASSWORD --env production

# Deploy
npm run deploy:production
```

### Frontend (Cloudflare Pages)

```bash
cd afia-web
npm ci
npm run build

# First deploy creates the project
npx wrangler pages deploy dist --project-name=neoa-web
```

After the first deploy, the CI/CD pipeline handles everything automatically.

---

## Step 4: Custom Domain (Optional)

### Backend API
1. Uncomment the `routes` section in `afia-api/wrangler.jsonc`
2. Set your domain: `"pattern": "api.neoa.com/*"`
3. In Cloudflare DNS, add a CNAME record pointing to your Workers route

### Frontend
1. In Cloudflare Dashboard → Pages → neoa-web → Custom Domains
2. Add `neoa.com` (or your domain)
3. Cloudflare handles SSL automatically

---

## Step 5: Verify Deployment

```bash
# Backend health check
curl https://neoa-api-production.<your-subdomain>.workers.dev/
# Expected: {"status":"ok","service":"afia-api","version":"0.4.1"}

# Frontend
# Visit your Pages URL — the app should load
```

---

## CI/CD Pipeline

| Workflow | Trigger | What It Does |
|---|---|---|
| `deploy-api.yml` | Push to `main` (when `afia-api/**` changes) | Deploys backend to Workers |
| `deploy-web.yml` | Push to `main` (when `afia-web/**` changes) | Builds + deploys frontend to Pages |
| `ci.yml` | All PRs to `main` | Lint + type-check + build validation |

All workflows also support **manual dispatch** via the GitHub Actions UI.

---

## Updating API Keys Later

When you receive production keys from Paystack/Wise/SmileID:

```bash
# Update Workers secrets
cd afia-api
npx wrangler secret put PAYSTACK_SECRET_KEY --env production
# Paste your sk_live_xxx key when prompted

npx wrangler secret put WISE_API_TOKEN --env production
npx wrangler secret put SMILEID_API_KEY --env production
# ... etc

# Update GitHub Secrets
# Go to repo → Settings → Secrets → Update each secret

# Trigger a redeploy
git commit --allow-empty -m "chore: rotate API keys"
git push
```

No code changes required — keys are injected via environment variables.

---

## Environments

| Environment | Backend Name | MFA | CORS |
|---|---|---|---|
| Development | `neoa-api` | Disabled | localhost allowed |
| Staging | `neoa-api-staging` | Disabled | FRONTEND_URL only |
| Production | `neoa-api-production` | Enabled | FRONTEND_URL only |
