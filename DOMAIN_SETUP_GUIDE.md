# Neoa Marketplace — Domain Setup Guide

> **Project**: Neoa (Premium Cross-Border Escrow Marketplace)
> **Strategy**: Cloudflare handles everything — domain registration, DNS, hosting, SSL, CDN
> **Prepared by**: Engineering Team
> **Date**: April 2026

---

## Before You Start

### What You Need

| Item | Details |
|---|---|
| Cloudflare Account | [dash.cloudflare.com](https://dash.cloudflare.com) — sign up if you don't have one |
| Payment Method | Credit/debit card for domain purchase (~$10/yr for .com) |
| The Chosen Domain | Replace **YOUR_DOMAIN.com** everywhere in this guide |
| GitHub Repo Access | [github.com settings → Secrets](https://github.com) for the Neoa repository |
| Supabase Dashboard | [supabase.com/dashboard](https://supabase.com/dashboard/project/cviwaycytjghpjzndode) |
| Paystack Dashboard | [dashboard.paystack.com](https://dashboard.paystack.com) |
| ~45 minutes | Total time (excluding DNS propagation) |

### Architecture After Setup

```
                    ┌─────────────────────────────┐
                    │     Cloudflare (Single       │
                    │       Account)               │
                    │                              │
  YOUR_DOMAIN.com ──┤  Domain Registration         │
                    │  DNS Management              │
                    │  SSL Certificates (auto)     │
                    │  CDN + DDoS Protection       │
                    │                              │
                    │  ┌───────────────────────┐   │
                    │  │ Cloudflare Pages      │   │
                    │  │ (Frontend)            │   │
                    │  │ neoa-web project      │   │
                    │  └───────────────────────┘   │
                    │                              │
                    │  ┌───────────────────────┐   │
                    │  │ Cloudflare Workers    │   │
                    │  │ (Backend API)         │   │
                    │  │ neoa-api project      │   │
                    │  └───────────────────────┘   │
                    └──────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │  Supabase                    │
                    │  (Database + Auth)           │
                    │  cviwaycytjghpjzndode        │
                    └─────────────────────────────┘
```

### URL Mapping After Setup

| Service | URL |
|---|---|
| Website (Frontend) | `https://YOUR_DOMAIN.com` |
| Website (www) | `https://www.YOUR_DOMAIN.com` → redirects to above |
| API (Backend) | `https://api.YOUR_DOMAIN.com` |
| Paystack Webhook | `https://api.YOUR_DOMAIN.com/api/webhooks/paystack` |
| Paystack Callback | `https://YOUR_DOMAIN.com/checkout/callback` |
| Password Reset | `https://YOUR_DOMAIN.com/auth/reset-password` |
| Email Verify | `https://YOUR_DOMAIN.com/auth/verify-email` |

---

## Step 1: Purchase Domain on Cloudflare

**Time: ~5 minutes**

1. Go to [domains.cloudflare.com](https://domains.cloudflare.com)
2. Search for: `YOUR_DOMAIN.com`
3. If available, click **"Purchase"**
4. Complete payment (~$10.44/yr for .com — no markup, no hidden fees)
5. WHOIS privacy is included automatically for free

**✅ Checkpoint**: In Cloudflare Dashboard → **Domain Registration → Manage Domains**, your domain should appear with status **"Active"**.

> **NOTE**: Since you're buying the domain directly on Cloudflare, DNS is configured automatically — no nameserver changes needed. This is the key advantage over buying elsewhere.

---

## Step 2: Configure DNS Records

**Time: ~5 minutes**

1. Go to **Cloudflare Dashboard → select YOUR_DOMAIN.com → DNS → Records**
2. Add the following records:

### Record 1 — Frontend (Root Domain)

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `@` |
| Target | `neoa-web.pages.dev` |
| Proxy status | ✅ Proxied (orange cloud ON) |
| TTL | Auto |

### Record 2 — Frontend (WWW)

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `www` |
| Target | `YOUR_DOMAIN.com` |
| Proxy status | ✅ Proxied (orange cloud ON) |
| TTL | Auto |

### Record 3 — Backend API

| Field | Value |
|---|---|
| Type | `A` |
| Name | `api` |
| Content | `192.0.2.1` |
| Proxy status | ✅ Proxied (orange cloud ON) |
| TTL | Auto |

> **WHY 192.0.2.1?** This is a dummy IP address. It doesn't matter because Cloudflare Workers will intercept all requests to `api.YOUR_DOMAIN.com` before they reach any server. The `A` record just tells Cloudflare "this subdomain exists and should be proxied." This is the standard Cloudflare Workers pattern.

**✅ Checkpoint**: You should have exactly 3 DNS records (more if you also use email — see note at the end of this guide).

---

## Step 3: Connect Custom Domain to Frontend (Cloudflare Pages)

**Time: ~5 minutes**

1. Go to **Cloudflare Dashboard → Workers & Pages**
2. Click on the **`neoa-web`** project
3. Go to the **"Custom domains"** tab
4. Click **"Set up a custom domain"**
5. Enter: `YOUR_DOMAIN.com`
6. Click **"Activate domain"**
7. Wait for the status to show ✅ **Active** (usually under 2 minutes)
8. **Repeat steps 4–7** for `www.YOUR_DOMAIN.com`

**✅ Checkpoint**: Visit `https://YOUR_DOMAIN.com` in your browser. The Neoa website should load. If it shows a Cloudflare error page, wait 5 minutes and try again.

---

## Step 4: Connect Custom Domain to Backend API (Cloudflare Workers)

**Time: ~10 minutes** (requires a command-line tool)

This step requires someone with access to the codebase (developer/engineer).

### 4a. Update the Worker Configuration File

Open the file `afia-api/wrangler.jsonc` and find this section (around line 59):

```
// Uncomment and set when custom domain is ready:
// "routes": [
//   { "pattern": "api.neoa.com/*", "zone_name": "neoa.com" }
// ]
```

**Replace it with** (remove the `//` comments and use your actual domain):

```json
"routes": [
  { "pattern": "api.YOUR_DOMAIN.com/*", "zone_name": "YOUR_DOMAIN.com" }
],
```

### 4b. Deploy the Updated Worker

Open a terminal/command prompt and run:

```bash
cd afia-api
npm ci
npm run deploy:production
```

### 4c. Verify

```bash
curl https://api.YOUR_DOMAIN.com/
```

**Expected response**:
```json
{"status":"ok","service":"afia-api","version":"0.4.1"}
```

**✅ Checkpoint**: The API responds at `https://api.YOUR_DOMAIN.com/`

---

## Step 5: Update Cloudflare Workers Secrets

**Time: ~5 minutes** (requires command-line access)

The API needs to know the new frontend URL so it allows requests from it (CORS security).

Open a terminal and run:

```bash
cd afia-api
npx wrangler secret put FRONTEND_URL --env production
```

When prompted, type:
```
https://YOUR_DOMAIN.com
```

Press Enter.

> **WHY THIS MATTERS**: The backend API only accepts requests from the URL stored in `FRONTEND_URL`. If this doesn't match your domain exactly, the website will show errors like "Failed to fetch" on every page that calls the API (checkout, login, products, etc.)

**✅ Checkpoint**: The secret is saved. No output confirmation needed — wrangler will say "Success".

---

## Step 6: Update GitHub Secrets

**Time: ~5 minutes**

This ensures the automated deployment pipeline (CI/CD) uses the correct URLs when building and deploying.

1. Go to your **GitHub Repository → Settings → Secrets and variables → Actions**
2. Find and **update** these two secrets:

| Secret Name | New Value |
|---|---|
| `FRONTEND_URL` | `https://YOUR_DOMAIN.com` |
| `API_URL` | `https://api.YOUR_DOMAIN.com` |

3. **Trigger a rebuild** to apply the changes:
   - Go to the **Actions** tab in GitHub
   - Click on **"Deploy Web to Cloudflare Pages"**
   - Click **"Run workflow"** → **"Run workflow"**
   - Wait for the build to complete (usually 2–3 minutes)

**✅ Checkpoint**: The GitHub Action completes with a green ✅. Visit `https://YOUR_DOMAIN.com` and the app should load with working API connections.

---

## Step 7: Update Supabase Authentication

**Time: ~5 minutes**

Supabase sends emails for password reset, email verification, and magic links. These emails contain links that must point to your domain.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/cviwaycytjghpjzndode/auth/url-configuration)
2. Log in if needed
3. Navigate to: **Authentication → URL Configuration**
4. Update:

| Setting | New Value |
|---|---|
| **Site URL** | `https://YOUR_DOMAIN.com` |

5. Under **Redirect URLs**, click **"Add URL"** and add these:

```
https://YOUR_DOMAIN.com/**
https://www.YOUR_DOMAIN.com/**
```

6. **Keep** the existing `https://neoa-web.pages.dev/**` entry (this is your fallback for preview/staging deployments)
7. Click **Save**

**✅ Checkpoint**: Trigger a "Forgot Password" flow on the website. The email you receive should contain a link to `https://YOUR_DOMAIN.com/auth/reset-password` (not `neoa-web.pages.dev`).

---

## Step 8: Update Paystack Configuration

**Time: ~5 minutes**

Paystack needs to know where to send payment notifications (webhooks) and where to redirect customers after payment.

### 8a. Webhook URL

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
2. Navigate to: **Settings → API Keys & Webhooks**
3. Update the **Webhook URL** to:

```
https://api.YOUR_DOMAIN.com/api/webhooks/paystack
```

4. Click **Save**

### 8b. Callback URL (Automatic — No Action Needed)

The checkout callback URL is built dynamically in the code using the `FRONTEND_URL` you set in Step 5:

```
https://YOUR_DOMAIN.com/checkout/callback
```

This happens automatically. No changes needed here.

### 8c. Whitelisted Domains (If Required)

1. In Paystack Dashboard → **Settings → Preferences**
2. If there's a "Whitelisted Domains" or "Allowed Domains" section, add:

```
YOUR_DOMAIN.com
```

**✅ Checkpoint**: Complete a test purchase on the website. After payment, Paystack should redirect you back to `https://YOUR_DOMAIN.com/checkout/callback`.

---

## Step 9: SSL & Security Settings

**Time: ~5 minutes**

1. Go to **Cloudflare Dashboard → YOUR_DOMAIN.com → SSL/TLS**

### SSL/TLS → Overview

| Setting | Value |
|---|---|
| Encryption mode | **Full (strict)** |

### SSL/TLS → Edge Certificates

| Setting | Value |
|---|---|
| Always Use HTTPS | ✅ **ON** |
| Automatic HTTPS Rewrites | ✅ **ON** |
| Minimum TLS Version | **TLS 1.2** |
| TLS 1.3 | ✅ **ON** |

**✅ Checkpoint**: Visit `http://YOUR_DOMAIN.com` (without https). It should automatically redirect to `https://YOUR_DOMAIN.com`.

---

## Step 10: Performance Settings (Recommended)

**Time: ~3 minutes**

These are optional but recommended for a faster, more professional experience.

### Speed → Optimization

Go to **Cloudflare Dashboard → YOUR_DOMAIN.com → Speed → Optimization**:

| Setting | Value |
|---|---|
| Auto Minify — JavaScript | ✅ ON |
| Auto Minify — CSS | ✅ ON |
| Auto Minify — HTML | ✅ ON |
| Brotli | ✅ ON |
| Early Hints | ✅ ON |

### Caching → Configuration

| Setting | Value |
|---|---|
| Caching Level | **Standard** |
| Browser Cache TTL | **4 hours** |

### Rules → Page Rules (Optional)

Add a rule to prevent API responses from being cached:

| Field | Value |
|---|---|
| URL | `api.YOUR_DOMAIN.com/*` |
| Setting | Cache Level → **Bypass** |

---

## Final Verification Checklist

Go through each item after completing all steps above. **All 10 must pass.**

| # | What to Check | How | ✅ Expected Result |
|---|---|---|---|
| 1 | Domain registered | Cloudflare Dashboard → Domain Registration | Shows "Active" |
| 2 | Website loads | Browser → `https://YOUR_DOMAIN.com` | Neoa homepage appears |
| 3 | WWW works | Browser → `https://www.YOUR_DOMAIN.com` | Redirects to `https://YOUR_DOMAIN.com` |
| 4 | API works | Browser → `https://api.YOUR_DOMAIN.com/` | Shows `{"status":"ok",...}` |
| 5 | HTTPS enforced | Browser → `http://YOUR_DOMAIN.com` | Auto-redirects to `https://` |
| 6 | SSL certificate | Click lock icon 🔒 in browser address bar | Shows valid Cloudflare certificate |
| 7 | Login works | Log in with a test account | Successfully authenticates |
| 8 | Checkout works | Add item to cart → proceed to pay | Paystack loads, redirects back correctly |
| 9 | Password reset | Click "Forgot Password" → check email | Email links to `YOUR_DOMAIN.com/auth/reset-password` |
| 10 | No console errors | Browser → Right-click → Inspect → Console tab | No red CORS or network errors |

---

## Quick Find-and-Replace Summary

When the domain name is chosen, replace `YOUR_DOMAIN.com` in these locations:

| Location | What to Change | Count |
|---|---|---|
| `afia-api/wrangler.jsonc` | Routes pattern + zone_name | 2 replacements |
| Cloudflare Workers Secret | `FRONTEND_URL` value | 1 (via CLI command) |
| GitHub Secrets | `FRONTEND_URL` + `API_URL` | 2 secrets |
| Supabase Dashboard | Site URL + Redirect URLs | 3 entries |
| Paystack Dashboard | Webhook URL | 1 entry |
| Cloudflare DNS | DNS records (auto from domain) | 3 records |
| Cloudflare Pages | Custom domain entries | 2 entries |
| **Total** | | **14 replacements** |

---

## Troubleshooting

### "This site can't be reached"
- DNS records not set up (Step 2) or domain not yet active
- Wait 5–10 minutes after domain purchase for activation

### Website loads but API calls fail (empty pages, loading forever)
- `FRONTEND_URL` Worker secret doesn't match domain exactly (Step 5)
- Must be `https://YOUR_DOMAIN.com` — no trailing slash

### "Failed to fetch" errors in browser console
- CORS issue — the `FRONTEND_URL` secret in Workers doesn't match (Step 5)
- Redeploy the API after updating: `npm run deploy:production`

### Paystack redirects to old URL after payment
- GitHub Secret `FRONTEND_URL` not updated (Step 6)
- Trigger a manual rebuild of the frontend via GitHub Actions

### Password reset email links to `neoa-web.pages.dev`
- Supabase "Site URL" not updated (Step 7)

### SSL certificate error
- Set SSL mode to "Full (strict)" — not just "Full" or "Flexible" (Step 9)

---

## Notes on Email

If you plan to use email with this domain (e.g., `hello@YOUR_DOMAIN.com`), you'll need additional DNS records. Cloudflare offers [Email Routing](https://developers.cloudflare.com/email-routing/) for free, which can forward emails to your existing Gmail/Outlook. This is a separate setup and does not affect the website or API configuration above.

---

## Cost Summary

| Item | Annual Cost |
|---|---|
| Domain (.com) | ~$10.44 |
| Cloudflare DNS | Free |
| Cloudflare Pages (Frontend hosting) | Free |
| Cloudflare Workers (API hosting) | Free (up to 100k requests/day) |
| SSL Certificates | Free (auto-renewing) |
| DDoS Protection | Free |
| CDN (Global) | Free |
| WHOIS Privacy | Free |
| **Total** | **~$10.44/year** |

> For comparison, this same setup on GoDaddy + a traditional VPS would cost $200–$400/year.
