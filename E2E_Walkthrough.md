
# 🧪 Project Afia: End-to-End Demonstration Script

This document guides you through the complete lifecycle of an Escrow Transaction on Project Afia.

## 1. Prerequisites
- **Admin Dashboard**: Open `http://localhost:5173/` (God Mode)
- **Buyer Sandbox**: Toggle using the button in bottom-right corner.
- **Database**: Live on Supabase (`cviwaycytjghpjzndode`)

---

## 2. The Flow

### Step 1: The Transaction (Buyer Sandbox)
1.  Switch to **Checkout / KYC Demo**.
2.  **Verify Identity**:
    -   Click "Verify Identity (SmileID)".
    -   Watch the simulated biometric scan (3s delay).
    -   Result: **VERIFIED**.
3.  **Purchase Item**:
    -   Click "Buy Now" on the Nike Air Max.
    -   Enter Fake Card details (auto-filled).
    -   Click "Pay NGN 45,000".
    -   Result: **Payment Successful!**

### Step 2: Logistics Update (Simulated)
*Since we don't have a vendor dashboard yet, we simulate the shipping update via API.*

**Action**: The system automatically updates the order status to `SHIPPED` via the "Dual-Rail" logic when the payment is confirmed.

### Step 3: Delivery Confirmation
**Action**: The Buyer confirms receipt (or the API tracks delivery).
-   This triggers the **48-hour Dispute Timer**.

### Step 4: The Friday Payout Gate (Super Admin)
1.  Switch to **Super Admin** view.
2.  Click **Friday Payout Gate**.
3.  You should see the order in the list if the 48-hour timer has elapsed (or if we simulated it).
4.  **Review**:
    -   Check "Wise ID".
    -   Click "View Waybill" to see proof of delivery.
5.  **Approve**:
    -   Click "Approve Payout".
    -   Result: Funds Released (marked in `escrow_ledger`).

### Step 5: Handling Disputes (Super Admin)
1.  Switch to **Dispute Arbitration**.
2.  If an order was flagged, it appears here.
3.  **Resolve**:
    -   Click "Force Complete" to pay the vendor anyway.
    -   Click "Force Refund" to return funds to the buyer.

---

## 3. Verification
Check your Supabase Dashboard > Table Editor > `escrow_ledger`.
-   You will see the final status update to `RELEASED`.
