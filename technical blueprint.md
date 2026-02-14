Project Afia: Master Technical Blueprint (v4.0)

Project Vision: A high-trust, cross-border escrow marketplace connecting African vendors to global buyers with bank-grade security and localized logistics.

1. Architecture & Tech Stack (The Edge-First Stack)

Frontend: React 19 + Tailwind v4 + Framer Motion (for smooth mobile interactions).

Compute (Backend): Hono.js running on Cloudflare Workers (Global low-latency execution).

State Machine: Cloudflare Durable Objects (Acts as "Digital Twins" for every order to handle real-time tracking and timers).

Database: Supabase (PostgreSQL 15) with Row-Level Security (RLS) for multi-tenant isolation.

Integrations:

Paystack: Collection (NGN/USD) and local NGN payouts.

Wise: Global Payouts (USD/GBP/EUR).

SmileID: Biometric KYC/KYB for vendor verification.

Terminal Africa: Automated shipping API/Tracking.

2. The User Journey & RBAC Matrix

Access is strictly controlled via JSON Web Tokens (JWT) and Database Roles.

Role

Description

Access Level

Guest

Unauthenticated Browser

Read-only access to product catalog and landing pages.

Buyer

Verified Consumer

Create orders, manage own escrow, dispute delivery, confirm receipt.

Seller (Unv)

New Vendor

Dashboard access only; cannot list products until KYC is verified.

Seller (Ver)

Verified Business

Create/Edit products, fulfill orders, upload waybills, request payouts.

Admin

Operations Staff

Moderate listings, view orders, handle basic support.

Super Admin

Platform Owner

"God Mode": Manual Escrow Override, Treasury Bridge Management, Final Payout Authorization.

3. Product Engine & Catalog Architecture

Multi-Currency Engine: Products are listed in the Vendor's local currency but displayed to Buyers in their detected local currency (via IP Geolocation) using a real-time FX feed + a 3% "Volatility Buffer."

Category Logic: Nested categories with specific "Customs Attributes" (e.g., Clothing vs. Electronics) to help calculate international shipping risks.

Stock Lock: When a buyer initiates a checkout, stock is "Reserved" for 15 minutes to prevent overselling while Paystack processes the payment.

4. The Digital Vault (Escrow System)

A. Core Schema (The Ledger)

We use a Double-Entry Ledger system. Funds are never just a "number" on a user profile; they are a series of immutable entries.

Table: profiles (User & Vendor Data)

id (uuid)

role

kyc_status

settlement_currency (NGN/USD)

wise_recipient_id

Table: orders (The Contract)

id

buyer_id, vendor_id

status (PAID, SHIPPED, DELIVERED, COMPLETED, DISPUTED)

shipping_rail: enum (API_AUTOMATED, MANUAL_WAYBILL)

waybill_url: string

courier_phone: string

estimated_delivery_date: timestamp (Set by Vendor)

delivered_at: timestamp

auto_release_at: timestamp

Table: escrow_ledger (The Money)

id, order_id

gross_amount

fee_amount (15%)

payout_amount (85%)

payout_rail: enum (PAYSTACK_NGN, WISE_GLOBAL)

vault_status: enum (LOCKED, RELEASE_PENDING, RELEASED, FROZEN)

5. Dual-Rail Logistics Logic

When a vendor initiates fulfillment, the system forks into two logic paths:

Rail 1: API-Automated Shipping (Professional)

Trigger: Vendor enters Tracking ID from supported carrier (DHL, GIGM).

Verification: Cloudflare Worker polls Carrier API.

Transition: Upon "Delivered" signal, status moves to DELIVERED, delivered_at = now(), and 48-hour dispute timer starts.

Rail 2: Manual Waybill Shipping (Local/KISS)

Trigger: Vendor uploads Waybill Photo + Courier Phone + Sets Estimated Delivery Date (EDD).

Verification:

The Handshake: Buyer clicks "Confirm Delivery" (Sets delivered_at = now()).

Passive Safety: If Buyer is silent, status moves to DELIVERED at EDD + 24 Hours.

Transition: Once status is DELIVERED, the 48-hour dispute timer starts.

6. Security & Observability ("Glass-Box")

A. The Checkpoint (Friday Payout Gate)

The Super Admin has the ultimate "Kill Switch" and "Approval Gate" to prevent fraud or system errors. The system never sends money to Wise or Paystack automatically.

The Queue: All orders that passed the 48-hour dispute window appear in the "Pending Approval" tab.

The Audit: The Super Admin reviews the Margin Guard flags (checking if FX rates changed too much).

The Verification: Admin can click "View Waybill" for any order in the batch to spot-check proof of delivery.

The "Authorize" Button: Only after the Super Admin clicks "Approve & Execute Batch" does the system call the Wise/Paystack APIs to move funds.

B. Dispute Arbitration

Access to courier_phone and waybill_url.

Manual Override: Admin can manually move an order to REFUNDED or COMPLETED regardless of the timer status.

7. Super Admin "God Mode" Dashboard

A dedicated UI for the Platform Owner to manage the Treasury Bridge:

Payout Queue: Aggregated view of all COMPLETED orders ready for Friday settlement.

Treasury Toggle: A button to switch between "Manual Hold" and "Auto-Payout" for specific vendors.

Dispute Arbitration: Access to Waybill photos and "Call Courier" buttons to resolve DISPUTED orders.

Global Settlement Trigger: Single-click execution to trigger Wise API batch transfers once the Bridge is funded.

8. System Workflow (The 10 Steps)

Checkout: Buyer pays -> Paystack sends Webhook.

Vaulting: Hono.js writes to escrow_ledger as LOCKED.

Fulfillment Choice: Vendor chooses API Rail or Manual Rail.

Proof: Vendor uploads Waybill (Manual) or Tracking ID (API).

Tracking: Durable Object monitors EDD or Carrier API.

Delivery Handshake: Buyer confirms OR System auto-moves to DELIVERED after EDD.

Safety Buffer: Funds enter a 48-Hour Dispute Window.

Audit: Margin Guard runs a final check on the transaction.

Queue: Order moves to payout_queue (Status: COMPLETED).

Settlement: Friday Batch Payout via Wise (Global) or Paystack (Local).