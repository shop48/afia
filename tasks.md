# Project Afia — Master Task Tracker

> Tracks ALL tasks across ALL modules. Check off as completed.
> Each task has a unique ID for traceability.

---

## ✅ MODULE 0: Foundation (COMPLETED)
- [x] M0.1: Create Supabase project (`cviwaycytjghpjzndode`) <!-- id: 0 -->
- [x] M0.2: Apply database schema (tables, enums, triggers, views) <!-- id: 1 -->
- [x] M0.3: Seed test data (vendor, buyer, product) <!-- id: 2 -->
- [x] M0.4: Scaffold Hono.js backend (`afia-api`) <!-- id: 3 -->
- [x] M0.5: Scaffold React 19 frontend (`afia-web`) <!-- id: 4 -->
- [x] M0.6: Build Admin Dashboard MVP (Payout Gate + Disputes) <!-- id: 5 -->
- [x] M0.7: Verify end-to-end data flow (DB → View → Frontend) <!-- id: 6 -->

---

## 🔲 MODULE 1: Design System & Brand Identity
- [ ] M1.1: Create CSS design tokens (NEOA color palette) <!-- id: 10 -->
- [ ] M1.2: Install Playfair Display + Inter fonts <!-- id: 11 -->
- [ ] M1.3: Build Button component (Primary, Secondary, Danger, Gold) <!-- id: 12 -->
- [ ] M1.4: Build Input component (Text, Email, Password, File) <!-- id: 13 -->
- [ ] M1.5: Build Card component (Product, Order, Status) <!-- id: 14 -->
- [ ] M1.6: Build Badge component (Verified, Disputed, Pending) <!-- id: 15 -->
- [ ] M1.7: Build Modal component <!-- id: 16 -->
- [ ] M1.8: Build Skeleton Loader component <!-- id: 17 -->
- [ ] M1.9: Build Step Progress Tracker (10-step order flow) <!-- id: 18 -->
- [ ] M1.10: Build Toast Notification system <!-- id: 19 -->
- [ ] M1.11: Configure Framer Motion animation presets <!-- id: 20 -->
- [ ] M1.12: Build responsive layout shell (desktop sidebar + mobile bottom nav) <!-- id: 21 -->
- [ ] **TEST**: Screenshot all components on a demo page <!-- id: 22 -->

---

## 🔲 MODULE 2: Authentication & User Management
- [ ] M2.1: DB migration — `handle_new_user()` trigger for auto-profile creation <!-- id: 30 -->
- [ ] M2.2: Build Signup page (Buyer / Vendor role selection) <!-- id: 31 -->
- [ ] M2.3: Build Login page <!-- id: 32 -->
- [ ] M2.4: Build Forgot Password page <!-- id: 33 -->
- [ ] M2.5: Build Email Verification landing page <!-- id: 34 -->
- [ ] M2.6: Create `useAuth` hook (context provider) <!-- id: 35 -->
- [ ] M2.7: Implement route guards (Guest / Buyer / Vendor / Admin) <!-- id: 36 -->
- [ ] M2.8: Implement MFA for Super Admin (Supabase TOTP) <!-- id: 37 -->
- [ ] M2.9: DB migration — Production RLS policies (all tables) <!-- id: 38 -->
- [ ] **TEST** T2.1: Signup creates profile with correct role <!-- id: 39 -->
- [ ] **TEST** T2.2: Buyer cannot access vendor/admin routes <!-- id: 40 -->
- [ ] **TEST** T2.3: Unverified vendor blocked from product creation <!-- id: 41 -->
- [ ] **TEST** T2.4: Super Admin MFA enforced <!-- id: 42 -->
- [ ] **TEST** T2.5: RLS blocks cross-user data access <!-- id: 43 -->

---

## 🔲 MODULE 3: Product Catalog
- [ ] M3.1: Vendor — Create Product form <!-- id: 50 -->
- [ ] M3.2: Vendor — Edit / Delete Product <!-- id: 51 -->
- [ ] M3.3: Vendor — Product image upload (Supabase Storage) <!-- id: 52 -->
- [ ] M3.4: Vendor — Stock count management UI <!-- id: 53 -->
- [ ] M3.5: Public Catalog page (product grid, search, filters) <!-- id: 54 -->
- [ ] M3.6: Product Detail page (gallery, price, vendor info) <!-- id: 55 -->
- [ ] M3.7: Multi-Currency display engine (FX rate + 3% buffer) <!-- id: 56 -->
- [ ] M3.8: Trust badges ("Escrow Protected", "Verified by SmileID") <!-- id: 57 -->
- [ ] M3.9: Stock Lock — 15-min reservation (Durable Object) <!-- id: 58 -->
- [ ] **TEST** T3.1: Unverified vendor cannot create products <!-- id: 59 -->
- [ ] **TEST** T3.2: Product with 0 stock shows "Out of Stock" <!-- id: 60 -->
- [ ] **TEST** T3.3: FX display uses correct rate + buffer <!-- id: 61 -->
- [ ] **TEST** T3.4: Concurrent checkout blocked for last-in-stock item <!-- id: 62 -->

---

## 🔲 MODULE 4: Checkout & Escrow Vaulting
- [ ] M4.1: Checkout page (order summary, FX rate, shipping estimate) <!-- id: 70 -->
- [ ] M4.2: Paystack inline payment initialization <!-- id: 71 -->
- [ ] M4.3: Backend — Paystack webhook handler (signature verification) <!-- id: 72 -->
- [ ] M4.4: Backend — Create Order + Escrow Ledger on successful payment <!-- id: 73 -->
- [ ] M4.5: Backend — Idempotency key check (reject duplicate webhooks) <!-- id: 74 -->
- [ ] M4.6: Backend — Margin Guard (compare checkout FX vs. current FX) <!-- id: 75 -->
- [ ] M4.7: DB migration — Unique constraint on `escrow_ledger(order_id)` <!-- id: 76 -->
- [ ] **TEST** T4.1: Payment creates Order + Ledger correctly <!-- id: 77 -->
- [ ] **TEST** T4.2: Duplicate webhook does NOT create second entry <!-- id: 78 -->
- [ ] **TEST** T4.3: Payment failure does NOT create order <!-- id: 79 -->
- [ ] **TEST** T4.4: Margin Guard flags FX drift > 3% <!-- id: 80 -->
- [ ] **TEST** T4.5: Stock decrements on purchase, increments on refund <!-- id: 81 -->

---

## 🔲 MODULE 5: Logistics — Dual-Rail Fulfillment
- [ ] M5.1: Vendor Fulfillment UI (choose Rail 1 or Rail 2) <!-- id: 90 -->
- [ ] M5.2: Rail 1 — Enter carrier + tracking ID <!-- id: 91 -->
- [ ] M5.3: Rail 2 — Upload waybill + courier phone + set EDD <!-- id: 92 -->
- [ ] M5.4: Backend — Order status transitions (PAID→SHIPPED→DELIVERED→COMPLETED) <!-- id: 93 -->
- [ ] M5.5: Buyer — Order Dashboard (Step Progress Tracker) <!-- id: 94 -->
- [ ] M5.6: Buyer — Live 48h Countdown Timer <!-- id: 95 -->
- [ ] M5.7: Buyer — "Confirm Delivery" button <!-- id: 96 -->
- [ ] M5.8: Buyer — "Report Issue / Dispute" button <!-- id: 97 -->
- [ ] M5.9: Backend — EDD+24h auto-delivery trigger (Durable Object) <!-- id: 98 -->
- [ ] M5.10: Backend — 48h dispute window timer (Durable Object) <!-- id: 99 -->
- [ ] M5.11: Durable Object — Persistent storage for timer survival <!-- id: 100 -->
- [ ] M5.12: Terminal Africa API integration (Rail 1 tracking) <!-- id: 101 -->
- [ ] **TEST** T5.1: Vendor upload transitions order to SHIPPED <!-- id: 102 -->
- [ ] **TEST** T5.2: Buyer confirm sets delivered_at + starts 48h <!-- id: 103 -->
- [ ] **TEST** T5.3: Silent buyer → auto-DELIVERED at EDD+24h <!-- id: 104 -->
- [ ] **TEST** T5.4: 48h expiry → COMPLETED <!-- id: 105 -->
- [ ] **TEST** T5.5: Durable Object survives restart <!-- id: 106 -->
- [ ] **TEST** T5.6: Admin can preview waybill image inline <!-- id: 107 -->

---

## 🔲 MODULE 6: Dispute Resolution
- [ ] M6.1: Buyer — "Report Issue" flow (reason + evidence upload) <!-- id: 110 -->
- [ ] M6.2: Admin — Enhanced arbitration (buyer evidence vs. vendor waybill) <!-- id: 111 -->
- [ ] M6.3: Admin — "Call Courier" button <!-- id: 112 -->
- [ ] M6.4: Admin — Notes / chat log per dispute <!-- id: 113 -->
- [ ] M6.5: Backend — Dispute state machine (DELIVERED→DISPUTED→COMPLETED/REFUNDED) <!-- id: 114 -->
- [ ] M6.6: Backend — Escrow ledger updates on resolution <!-- id: 115 -->
- [ ] M6.7: Backend — Paystack refund API on Force Refund <!-- id: 116 -->
- [ ] **TEST** T6.1: Dispute pauses auto-release timer <!-- id: 117 -->
- [ ] **TEST** T6.2: Force Complete releases funds to vendor <!-- id: 118 -->
- [ ] **TEST** T6.3: Force Refund freezes vault + triggers refund <!-- id: 119 -->
- [ ] **TEST** T6.4: Cannot dispute after 48h window <!-- id: 120 -->
- [ ] **TEST** T6.5: Only Super Admin can force-complete/refund <!-- id: 121 -->

---

## 🔲 MODULE 7: Super Admin God Mode (Production)
- [ ] M7.1: Batch selection UI (select all / individual) <!-- id: 130 -->
- [ ] M7.2: Margin Guard status per order (green/red flag) <!-- id: 131 -->
- [ ] M7.3: Inline waybill image preview <!-- id: 132 -->
- [ ] M7.4: "Recalculate Batch" button (re-fetch FX) <!-- id: 133 -->
- [ ] M7.5: "Approve & Execute Batch" button (calls Wise + Paystack) <!-- id: 134 -->
- [ ] M7.6: MFA prompt before batch execution <!-- id: 135 -->
- [ ] M7.7: Vendor Management (Flag, Freeze, Treasury Toggle) <!-- id: 136 -->
- [ ] M7.8: Analytics Dashboard (escrow totals, dispute rate, order count) <!-- id: 137 -->
- [ ] M7.9: Audit Log (immutable admin action trail) <!-- id: 138 -->
- [ ] **TEST** T7.1: Batch payout calls correct API with correct amounts <!-- id: 139 -->
- [ ] **TEST** T7.2: Flagged vendor orders frozen instantly <!-- id: 140 -->
- [ ] **TEST** T7.3: KYC velocity alert fires on threshold <!-- id: 141 -->
- [ ] **TEST** T7.4: MFA required before Execute Batch <!-- id: 142 -->
- [ ] **TEST** T7.5: Audit log records every admin action <!-- id: 143 -->

---

## 🔲 MODULE 8: Real Payment Integrations
- [ ] M8.1: Paystack — Initialize transaction (server-side) <!-- id: 150 -->
- [ ] M8.2: Paystack — Inline popup (client-side) <!-- id: 151 -->
- [ ] M8.3: Paystack — Webhook handler with signature verification <!-- id: 152 -->
- [ ] M8.4: Paystack — Refund API integration <!-- id: 153 -->
- [ ] M8.5: Wise — Create recipient profiles <!-- id: 154 -->
- [ ] M8.6: Wise — Create + fund transfers <!-- id: 155 -->
- [ ] M8.7: Wise — Batch transfer execution <!-- id: 156 -->
- [ ] M8.8: Wise — Webhook for transfer status <!-- id: 157 -->
- [ ] M8.9: SmileID — Enhanced KYC flow (BVN + Selfie) <!-- id: 158 -->
- [ ] M8.10: SmileID — Webhook for verification result <!-- id: 159 -->
- [ ] M8.11: SmileID — Auto-update profile kyc_level <!-- id: 160 -->
- [ ] **TEST** T8.1: Paystack sandbox charge + webhook fires <!-- id: 161 -->
- [ ] **TEST** T8.2: Wise sandbox transfer reaches funds_converted <!-- id: 162 -->
- [ ] **TEST** T8.3: SmileID sandbox returns verification result <!-- id: 163 -->
- [ ] **TEST** T8.4: Invalid Paystack signature rejected <!-- id: 164 -->
- [ ] **TEST** T8.5: Wise idempotency prevents double-send <!-- id: 165 -->

---

## 🔲 MODULE 9: Notifications
- [ ] M9.1: In-app Activity Feed (notification bell with pulse) <!-- id: 170 -->
- [ ] M9.2: Email — Order confirmed <!-- id: 171 -->
- [ ] M9.3: Email — Waybill uploaded (to buyer) <!-- id: 172 -->
- [ ] M9.4: Email — Delivery confirmed <!-- id: 173 -->
- [ ] M9.5: Email — 24h pre-release warning <!-- id: 174 -->
- [ ] M9.6: Email — Payout released (to vendor) <!-- id: 175 -->
- [ ] M9.7: Email — Dispute opened / resolved <!-- id: 176 -->
- [ ] M9.8: Toast notifications for real-time UI updates <!-- id: 177 -->
- [ ] **TEST** T9.1: Buyer gets email on waybill upload <!-- id: 178 -->
- [ ] **TEST** T9.2: Buyer gets 24h warning before auto-release <!-- id: 179 -->
- [ ] **TEST** T9.3: Vendor gets email on payout release <!-- id: 180 -->

---

## 🔲 MODULE 10: Security Hardening
- [ ] M10.1: Re-enable RLS with proper role-based policies <!-- id: 190 -->
- [ ] M10.2: Unique index on escrow_ledger(order_id) <!-- id: 191 -->
- [ ] M10.3: Idempotency keys for all payment API calls <!-- id: 192 -->
- [ ] M10.4: Paystack webhook signature verification <!-- id: 193 -->
- [ ] M10.5: Device fingerprinting (PostHog) <!-- id: 194 -->
- [ ] M10.6: KYC velocity check (>$500 in 48h) <!-- id: 195 -->
- [ ] M10.7: MFA enforcement for Super Admin <!-- id: 196 -->
- [ ] M10.8: Rate limiting on all API endpoints <!-- id: 197 -->
- [ ] M10.9: CORS configuration <!-- id: 198 -->
- [ ] M10.10: Input validation & sanitization <!-- id: 199 -->
- [ ] **TEST** T10.1: Anon cannot read other user's orders <!-- id: 200 -->
- [ ] **TEST** T10.2: Double POST returns same result <!-- id: 201 -->
- [ ] **TEST** T10.3: Tampered webhook rejected <!-- id: 202 -->
- [ ] **TEST** T10.4: Same-device buyer+vendor flagged <!-- id: 203 -->
- [ ] **TEST** T10.5: SQL injection blocked <!-- id: 204 -->

---

## 🔲 MODULE 11: Deployment & DevOps
- [ ] M11.1: Deploy backend to Cloudflare Workers <!-- id: 210 -->
- [ ] M11.2: Deploy frontend to Cloudflare Pages <!-- id: 211 -->
- [ ] M11.3: Configure custom domain + SSL <!-- id: 212 -->
- [ ] M11.4: Set production env vars in Cloudflare <!-- id: 213 -->
- [ ] M11.5: CI/CD via GitHub Actions <!-- id: 214 -->
- [ ] M11.6: PostHog analytics integration <!-- id: 215 -->
- [ ] M11.7: Error monitoring (Sentry / CF Logpush) <!-- id: 216 -->
- [ ] **TEST** T11.1: Production build succeeds <!-- id: 217 -->
- [ ] **TEST** T11.2: All API routes reachable on production URL <!-- id: 218 -->
- [ ] **TEST** T11.3: SSL certificates valid <!-- id: 219 -->

---

## Summary

| Module | Tasks | Tests | Status |
|--------|-------|-------|--------|
| M0: Foundation | 7 | 0 | ✅ DONE |
| M1: Design System | 12 | 1 | 🔲 TODO |
| M2: Auth & Roles | 9 | 5 | 🔲 TODO |
| M3: Product Catalog | 9 | 4 | 🔲 TODO |
| M4: Checkout & Escrow | 7 | 5 | 🔲 TODO |
| M5: Logistics | 12 | 6 | 🔲 TODO |
| M6: Disputes | 7 | 5 | 🔲 TODO |
| M7: Admin God Mode v2 | 9 | 5 | 🔲 TODO |
| M8: Real Payments | 11 | 5 | 🔲 TODO |
| M9: Notifications | 8 | 3 | 🔲 TODO |
| M10: Security | 10 | 5 | 🔲 TODO |
| M11: Deployment | 7 | 3 | 🔲 TODO |
| **TOTAL** | **108** | **47** | — |
