Project Afia: Senior Architect's Security & Edge Case Manifest
This document outlines critical vulnerabilities and operational edge cases that must be mitigated during the implementation phase.
1. FINANCIAL SECURITY (THE "DOUBLE-SPEND" RISK)
The Race Condition: If a buyer clicks "Confirm Delivery" multiple times rapidly, or if a webhook from a carrier is sent twice, can the system trigger two payout entries?
Mitigation: Antigravity must implement Database Constraints (Unique Indexes) on the escrow_ledger table using the order_id as a key. Only one LOCKED entry per order should ever exist.
The "Shadow" Payout: If a Super Admin approves a batch on Friday, but the Wise API times out, does the system mark the order as PAID?
Mitigation: Use Idempotency Keys for every Wise/Paystack API call. If the request is retried, the API provider will recognize the key and not send the money twice.
2. LOGISTICS EDGE CASES (THE "WAYBILL FRAUD")
The "Dead" Waybill: A vendor uploads a photo of a random piece of paper or a waybill from 3 years ago just to trigger the EDD timer.
Mitigation: The Super Admin Dashboard must include an Image Preview for every waybill in the Friday Payout queue. We must also implement a "Flag Vendor" tool where if one waybill is found to be fake, all other orders from that vendor are instantly frozen.
The "Abandoned" Package: What if the courier loses the package, the vendor claims it's shipped, and the buyer forgets to "Report Issue" within the EDD window?
Mitigation: The system should send a "Pre-Expiry Warning" to the buyer via Email/Push 24 hours before the auto-release happens. "Your package is scheduled for auto-confirmation tomorrow. If you haven't received it, click here to pause the timer."


3. IDENTITY & COLLUSION (THE "SYBIL ATTACK")
Self-Dealing: A fraudster creates a Buyer account and a Vendor account. They "buy" their own item with a stolen credit card, "confirm" delivery immediately, and withdraw the clean money on Friday.
Mitigation: 1. Device Fingerprinting: Use PostHog to detect if the Buyer and Vendor are using the same IP address or device.
2. KYC Velocity: Flag any new vendor who does more than $500 in sales within their first 48 hours without a history of smaller successful trades.
4. FX & TREASURY RISK (THE "LIQUIDITY GAP")
The Weekend Volatility: If the Naira crashes by 15% between the Thursday "Treasury Bridge" and the Friday Payout, the platform could lose money on the conversion.
Mitigation: The Margin Guard must be dynamic. It should pull a live FX rate at the moment of Admin Approval on Friday. If the margin has turned negative due to a crash, the Admin must be warned to "Recalculate Batch."
5. RECOVERY & SYSTEM HEALTH
Durable Object "Zombies": If the Cloudflare Worker crashes while the 48-hour timer is running, does the timer disappear?
Mitigation: Antigravity must use Persistent Storage within the Durable Object. Even if the code restarts, the Object should "remember" the exact second the timer is supposed to fire.
6. ADMIN "GOD MODE" SECURITY
The Compromised Admin: If an intruder gets your Admin password, they can pay themselves all the escrowed money.
Mitigation: MANDATORY Multi-Factor Authentication (MFA) for the Super Admin role. Additionally, the "Execute Payout" button should require a second "Master Password" or a Hardware Security Key (YubiKey).

