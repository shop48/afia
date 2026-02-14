# Project Afia — Production Implementation Plan (v5.0)

> **Goal**: Build a complete, production-ready cross-border escrow marketplace.
> **Principle**: Modular — each module is buildable, testable, and deployable independently.
> **Last Updated**: 2026-02-14

---

## Current State Audit (What Works Today)

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase DB (`cviwaycytjghpjzndode`) | ✅ LIVE | 4 tables, 1 view, 1 trigger |
| Admin Dashboard (God Mode) | ✅ Working | Payout Gate + Dispute Arbitration |
| Paystack/SmileID (Mock) | ⚠️ Mock Only | Simulated UI, no real API calls |
| Backend API (Hono.js) | ⚠️ Skeleton | Routes defined, Durable Object stub |
| Auth Flow | ❌ Not Built | No login/signup UI or Supabase Auth integration |
| Buyer Dashboard | ❌ Not Built | No product catalog, order tracking, or delivery confirm |
| Vendor Dashboard | ❌ Not Built | No product management, fulfillment, or waybill upload |
| RLS Policies | ⚠️ Disabled for Sandbox | Must be re-enabled with proper role-based policies |

---

## Architecture Overview

```
┌──────────────────────────────────┐
│          FRONTEND (React 19)     │
│  Guest │ Buyer │ Vendor │ Admin  │
└──────────────┬───────────────────┘
               │ HTTPS
┌──────────────▼───────────────────┐
│     BACKEND (Hono.js / CF Workers)│
│  Auth Middleware │ API Routes     │
│  Durable Objects (Order Timers)  │
└──────────────┬───────────────────┘
               │ SQL / REST
┌──────────────▼───────────────────┐
│     DATABASE (Supabase / PG 15)  │
│  profiles │ orders │ products    │
│  escrow_ledger │ RLS Policies    │
└──────────────────────────────────┘
               │
┌──────────────▼───────────────────┐
│       EXTERNAL INTEGRATIONS      │
│  Paystack │ Wise │ SmileID       │
│  Terminal Africa │ PostHog        │
└──────────────────────────────────┘
```

---

## Module Breakdown

### MODULE 1: Design System & Brand Identity
**Source**: UX/UI Identity Guidelines
**Goal**: Establish the visual foundation before building any pages.

- [ ] **1.1** Create design tokens (CSS variables) for NEOA palette
  - Primary: `#1A2332` (Deep Navy)
  - Secondary: `#E5E7EB` (Soft Platinum)
  - Accent: `#C5A059` (Old Gold)
  - Success: `#059669` (Emerald)
  - Warning: `#DC2626` (Ruby)
- [ ] **1.2** Install & configure typography (Playfair Display + Inter via Google Fonts)
- [ ] **1.3** Create reusable UI components library:
  - Button (Primary, Secondary, Danger, Gold)
  - Input (Text, Email, Password, File Upload)
  - Card (Product, Order, Status)
  - Badge (Verified, Disputed, Pending)
  - Modal (Confirmation dialogs, payments)
  - Skeleton Loader (shimmer effect per UX guidelines)
  - Step Progress Tracker (10-step order flow)
  - Toast Notifications
- [ ] **1.4** Implement Framer Motion animation presets (fade-in, slide-up, scale)
- [ ] **1.5** Build responsive layout shell (sidebar nav, mobile thumb-zone bottom nav)

**TEST**: Visual regression — screenshot each component in Storybook-style page.

---

### MODULE 2: Authentication & User Management
**Source**: Technical Blueprint §2 (RBAC Matrix), Security Manifest §5
**Goal**: Real Supabase Auth with role-based access control.

- [ ] **2.1** Database: Add `handle_new_user()` trigger to auto-create profile on signup
- [ ] **2.2** Build Auth pages:
  - Signup (Email + Password, with role selection: Buyer or Vendor)
  - Login
  - Forgot Password
  - Email Verification landing
- [ ] **2.3** Build Auth context provider (`useAuth` hook)
- [ ] **2.4** Implement route guards:
  - `/` — Guest (public catalog)
  - `/dashboard` — Buyer only
  - `/vendor` — Verified Vendor only
  - `/admin` — Super Admin only
- [ ] **2.5** Implement MFA for Super Admin (Supabase TOTP)
- [ ] **2.6** Update RLS policies for production:
  - Profiles: Users see own profile; Admins see all
  - Products: Public read if `is_active`; Vendor can CRUD own products
  - Orders: Buyer/Vendor see own orders; Admin sees all
  - Escrow Ledger: Admin-only read/write
  - Payout Queue View: Admin-only select

**TESTS**:
- [ ] T2.1: Signup creates profile with correct role
- [ ] T2.2: Buyer cannot access `/vendor` or `/admin`
- [ ] T2.3: Unverified vendor cannot list products
- [ ] T2.4: Super Admin MFA is enforced
- [ ] T2.5: RLS blocks cross-user data access (test with anon key)

---

### MODULE 3: Product Catalog (Guest + Vendor)
**Source**: Technical Blueprint §3
**Goal**: Vendors list products; Guests/Buyers browse them.

- [ ] **3.1** Vendor Dashboard — Product Management:
  - Create Product form (title, description, price, currency, stock, images)
  - Edit/Delete Product
  - Product image upload to Supabase Storage (with white BG requirement)
  - Stock count management
- [ ] **3.2** Public Catalog Page:
  - Product grid with card layout (gallery feel)
  - Search & filter by category
  - Currency display (show in buyer's local currency via IP detection)
  - "Escrow Protected" + "Verified Vendor" trust badges
- [ ] **3.3** Product Detail Page:
  - Image gallery
  - Price with FX conversion display
  - Vendor info + verification status
  - "Buy Now" button (links to checkout)
- [ ] **3.4** Multi-Currency Engine:
  - FX rate fetching (Wise API or open exchange rates)
  - 3% Volatility Buffer logic
  - Display: "≈ $XX.XX USD" next to NGN price
- [ ] **3.5** Stock Lock system (15-minute reservation via Durable Object)

**TESTS**:
- [ ] T3.1: Unverified vendor cannot create products (RLS + UI block)
- [ ] T3.2: Product with 0 stock shows "Out of Stock"
- [ ] T3.3: FX display updates when buyer's locale changes
- [ ] T3.4: Two buyers can't purchase last-in-stock item simultaneously

---

### MODULE 4: Checkout & Escrow Vaulting
**Source**: Technical Blueprint §4, §8 (Steps 1-2), Security Manifest §1
**Goal**: Buyer pays → Paystack webhook → funds LOCKED in vault.

- [ ] **4.1** Checkout page:
  - Order summary (product, price, FX rate, shipping estimate)
  - Paystack inline payment initiation (real sandbox keys)
  - Idempotency key generation (prevent double-charge)
- [ ] **4.2** Backend: Paystack webhook handler (`POST /api/webhooks/paystack`)
  - Verify webhook signature
  - Idempotency check (reject duplicate refs)
  - Create Order (status: `PAID`)
  - Create Escrow Ledger entry (status: `LOCKED`, 15% fee calculated)
  - Decrement product stock
- [ ] **4.3** Backend: Margin Guard
  - Compare FX rate at checkout vs. current rate
  - Flag if margin drift > 3%
  - Set `margin_check_passed` boolean on ledger
- [ ] **4.4** Unique constraint on `escrow_ledger.order_id` (prevent double-entry)

**TESTS**:
- [ ] T4.1: Successful payment creates Order + Ledger in correct state
- [ ] T4.2: Duplicate Paystack webhook does NOT create second entry
- [ ] T4.3: Payment failure does NOT create order
- [ ] T4.4: Margin Guard flags when FX drifts > 3%
- [ ] T4.5: Stock decrements on purchase, increments on refund

---

### MODULE 5: Logistics — Dual-Rail Fulfillment
**Source**: Technical Blueprint §5, Security Manifest §2
**Goal**: Vendor ships → system tracks → buyer confirms delivery.

- [ ] **5.1** Vendor Fulfillment UI:
  - Choose Rail: "API Tracking" or "Manual Waybill"
  - Rail 1: Enter carrier + tracking ID
  - Rail 2: Upload waybill photo + courier phone + set EDD
- [ ] **5.2** Backend: Order status transitions
  - `PAID → SHIPPED` (when vendor provides fulfillment info)
  - `SHIPPED → DELIVERED` (buyer confirms OR EDD+24h auto-moves)
  - `DELIVERED → COMPLETED` (after 48h with no dispute)
- [ ] **5.3** Buyer Order Dashboard:
  - Step Progress Tracker (10-step visual: Paid → Shipped → In Transit → ...)
  - Live Countdown Timer (48-hour dispute window)
  - "Confirm Delivery" button
  - "Report Issue / Dispute" button
  - Pre-expiry warning (24h before auto-release)
- [ ] **5.4** Durable Object: Timer Management
  - EDD+24h auto-delivery trigger (Rail 2)
  - 48-hour dispute window timer
  - Persistent storage (survives Worker restarts)
- [ ] **5.5** Terminal Africa API integration (Rail 1: carrier tracking polling)

**TESTS**:
- [ ] T5.1: Vendor upload transitions order to SHIPPED
- [ ] T5.2: Buyer "Confirm Delivery" sets `delivered_at` + starts 48h timer
- [ ] T5.3: Silent buyer → auto-DELIVERED at EDD+24h
- [ ] T5.4: 48h timer expiry transitions to COMPLETED
- [ ] T5.5: Durable Object survives restart (state persisted)
- [ ] T5.6: "Dead waybill" — admin can preview waybill image inline

---

### MODULE 6: Dispute Resolution
**Source**: Technical Blueprint §6B, Security Manifest §2
**Goal**: Buyer disputes → Admin arbitrates → refund or complete.

- [ ] **6.1** Buyer: "Report Issue" flow
  - Select reason (Not received, Wrong item, Damaged, Other)
  - Upload evidence photos
  - Sets `is_disputed = true`, pauses auto-release
- [ ] **6.2** Admin Arbitration Dashboard (enhance existing):
  - Side-by-side: Buyer evidence vs. Vendor waybill
  - "Call Courier" button (opens phone dialer with `courier_phone`)
  - Chat log / notes field for admin
  - Actions: "Force Complete" or "Force Refund"
- [ ] **6.3** Backend: Dispute state machine
  - `DELIVERED → DISPUTED` (buyer reports)
  - `DISPUTED → COMPLETED` (admin force-complete, release funds)
  - `DISPUTED → REFUNDED` (admin force-refund, reverse payment)
- [ ] **6.4** Escrow Ledger updates on resolution:
  - Force Complete: `LOCKED → RELEASED`
  - Force Refund: `LOCKED → FROZEN`, trigger Paystack refund API

**TESTS**:
- [ ] T6.1: Dispute pauses the 48h auto-release timer
- [ ] T6.2: Force Complete releases funds to vendor
- [ ] T6.3: Force Refund freezes vault + triggers Paystack refund
- [ ] T6.4: Buyer cannot dispute after 48h window closes
- [ ] T6.5: Only Super Admin can force-complete/refund (RLS)

---

### MODULE 7: Super Admin God Mode (Production)
**Source**: Technical Blueprint §7, Security Manifest §6
**Goal**: Production-grade admin with batch payouts and vendor management.

- [ ] **7.1** Friday Payout Gate (enhance existing):
  - Batch selection (select all / individual orders)
  - Margin Guard status per order (green/red flag)
  - Waybill image preview inline
  - "Recalculate Batch" button (re-fetch FX rates)
  - "Approve & Execute Batch" button (calls Wise + Paystack APIs)
  - Second-factor confirmation (Master Password / MFA prompt)
- [ ] **7.2** Vendor Management:
  - Flag Vendor (freeze all orders from this vendor)
  - KYC Velocity Alert (>$500 in first 48h)
  - Treasury Toggle (Manual Hold / Auto-Payout per vendor)
- [ ] **7.3** Analytics Overview:
  - Total escrowed amount (LOCKED)
  - Total released this week
  - Dispute rate (%)
  - Active orders count
- [ ] **7.4** Activity Feed / Audit Log
  - Every admin action logged with timestamp + admin ID
  - Immutable audit trail in DB

**TESTS**:
- [ ] T7.1: Batch payout calls Wise API with correct amounts
- [ ] T7.2: Flagged vendor's orders are frozen instantly
- [ ] T7.3: KYC velocity alert fires on threshold breach
- [ ] T7.4: MFA required before "Execute Batch"
- [ ] T7.5: Audit log records every admin action

---

### MODULE 8: Real Payment Integrations
**Source**: Technical Blueprint §1 (Integrations)
**Goal**: Replace mock components with real sandbox APIs.

- [ ] **8.1** Paystack (Collection):
  - Initialize transaction (server-side)
  - Inline payment popup (client-side)
  - Webhook handler with signature verification
  - Refund API integration
- [ ] **8.2** Wise (Payouts):
  - Create recipient profiles
  - Create + fund transfers
  - Batch transfer execution
  - Webhook for transfer status
- [ ] **8.3** SmileID (KYC):
  - Enhanced KYC flow (BVN + Selfie)
  - Webhook for verification result
  - Auto-update profile `kyc_level` on success

**TESTS**:
- [ ] T8.1: Paystack sandbox charge succeeds + webhook fires
- [ ] T8.2: Wise sandbox transfer reaches "funds_converted" state
- [ ] T8.3: SmileID sandbox returns verification result
- [ ] T8.4: Invalid Paystack webhook signature is rejected
- [ ] T8.5: Wise transfer with idempotency key prevents double-send

---

### MODULE 9: Notifications & Communication
**Source**: UX Guidelines §6
**Goal**: Keep users informed at every stage.

- [ ] **9.1** In-app Activity Feed (pulsing notification bell)
- [ ] **9.2** Email notifications (via Supabase Edge Functions):
  - Order confirmed
  - Waybill uploaded (to buyer)
  - Delivery confirmed
  - 24h pre-release warning
  - Payout released (to vendor)
  - Dispute opened/resolved
- [ ] **9.3** Toast notifications for real-time updates

**TESTS**:
- [ ] T9.1: Buyer receives email on waybill upload
- [ ] T9.2: Buyer receives 24h warning before auto-release
- [ ] T9.3: Vendor receives email on payout release

---

### MODULE 10: Security Hardening
**Source**: Security & Edge Case Manifest (all sections)
**Goal**: Production-ready security.

- [ ] **10.1** Re-enable RLS on all tables with proper policies
- [ ] **10.2** Unique index on `escrow_ledger(order_id)` (prevent double-entry)
- [ ] **10.3** Idempotency keys for all payment API calls
- [ ] **10.4** Paystack webhook signature verification
- [ ] **10.5** Device fingerprinting (PostHog) for Sybil attack detection
- [ ] **10.6** KYC velocity check (flag >$500 in first 48h)
- [ ] **10.7** MFA enforcement for Super Admin
- [ ] **10.8** Rate limiting on all API endpoints
- [ ] **10.9** CORS configuration (allow only frontend origin)
- [ ] **10.10** Input validation & sanitization on all API routes

**TESTS**:
- [ ] T10.1: Anon user cannot read other user's orders
- [ ] T10.2: Double POST to payment endpoint returns same result
- [ ] T10.3: Tampered webhook is rejected
- [ ] T10.4: Same-device buyer+vendor flagged
- [ ] T10.5: SQL injection attempts blocked

---

### MODULE 11: Deployment & DevOps
**Goal**: Ship to production.

- [ ] **11.1** Backend: Deploy Hono.js to Cloudflare Workers
- [ ] **11.2** Frontend: Deploy React app to Cloudflare Pages
- [ ] **11.3** Configure custom domain + SSL
- [ ] **11.4** Set environment variables in Cloudflare dashboard
- [ ] **11.5** Set up CI/CD (GitHub Actions → auto-deploy on push)
- [ ] **11.6** PostHog analytics integration
- [ ] **11.7** Error monitoring (Sentry or CF Logpush)

**TESTS**:
- [ ] T11.1: Production build succeeds without errors
- [ ] T11.2: All API routes reachable on production URL
- [ ] T11.3: SSL certificates valid

---

## Execution Order (Recommended)

```
Module 1 (Design System)
    ↓
Module 2 (Auth & Roles)
    ↓
Module 3 (Product Catalog)
    ↓
Module 4 (Checkout & Escrow)
    ↓
Module 5 (Logistics)
    ↓
Module 6 (Disputes)
    ↓
Module 7 (Admin God Mode v2)
    ↓
Module 8 (Real Payments)
    ↓
Module 9 (Notifications)
    ↓
Module 10 (Security Hardening)
    ↓
Module 11 (Deployment)
```

Each module is a self-contained sprint. We test each module before moving to the next.
