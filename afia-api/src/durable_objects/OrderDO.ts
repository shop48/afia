
import { DurableObject } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";

interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_KEY: string;
}

type TimerType = "edd_expiry" | "dispute_window" | "stock_lock";

interface TimerState {
    orderId: string;
    timerType: TimerType;
    alarmAt: number; // Unix ms
    paused: boolean;
    remainingMs?: number; // Stored when paused
}

export class OrderDO extends DurableObject {
    private state: DurableObjectState;
    private env: Env;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;
        this.env = env;
    }

    private getSupabase() {
        return createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_KEY);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === "/start-edd-timer") {
                return this.startEddTimer(request);
            }
            if (path === "/start-dispute-timer") {
                return this.startDisputeTimer(request);
            }
            if (path === "/pause-timer") {
                return this.pauseTimer();
            }
            if (path === "/resume-timer") {
                return this.resumeTimer();
            }
            if (path === "/status") {
                return this.getStatus();
            }
            if (path === "/lock-stock") {
                return this.lockStock(request);
            }

            return new Response("OrderDO: Unknown action", { status: 404 });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`OrderDO error on ${path}:`, message);
            return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
    }

    // ═══════════════════════════════════════
    // EDD+24h AUTO-DELIVERY TIMER (Rail 2)
    // ═══════════════════════════════════════

    private async startEddTimer(request: Request): Promise<Response> {
        const { orderId, eddIso } = await request.json() as { orderId: string; eddIso: string };

        if (!orderId || !eddIso) {
            return new Response("orderId and eddIso required", { status: 400 });
        }

        const eddMs = new Date(eddIso).getTime();
        const alarmAt = eddMs + 24 * 60 * 60 * 1000; // EDD + 24 hours

        const timerState: TimerState = {
            orderId,
            timerType: "edd_expiry",
            alarmAt,
            paused: false,
        };

        await this.state.storage.put("timer", timerState);
        await this.state.storage.setAlarm(alarmAt);

        console.log(`⏱️ EDD+24h timer set for order ${orderId} — fires at ${new Date(alarmAt).toISOString()}`);
        return Response.json({ message: "EDD timer started", alarmAt });
    }

    // ═══════════════════════════════════════
    // 48-HOUR DISPUTE WINDOW TIMER
    // ═══════════════════════════════════════

    private async startDisputeTimer(request: Request): Promise<Response> {
        const body = await request.json() as { orderId: string } | null;
        const existingTimer = await this.state.storage.get<TimerState>("timer");
        const orderId = body?.orderId || existingTimer?.orderId;

        if (!orderId) {
            return new Response("orderId required", { status: 400 });
        }

        const alarmAt = Date.now() + 48 * 60 * 60 * 1000; // 48 hours from now

        const timerState: TimerState = {
            orderId,
            timerType: "dispute_window",
            alarmAt,
            paused: false,
        };

        await this.state.storage.put("timer", timerState);
        await this.state.storage.setAlarm(alarmAt);

        console.log(`⏱️ 48h dispute timer set for order ${orderId} — fires at ${new Date(alarmAt).toISOString()}`);
        return Response.json({ message: "Dispute timer started", alarmAt });
    }

    // ═══════════════════════════════════════
    // PAUSE — called when dispute is filed
    // ═══════════════════════════════════════

    private async pauseTimer(): Promise<Response> {
        const timer = await this.state.storage.get<TimerState>("timer");
        if (!timer) {
            return new Response("No active timer", { status: 404 });
        }
        if (timer.paused) {
            return new Response("Timer already paused", { status: 409 });
        }

        // Calculate remaining time and cancel the alarm
        const remainingMs = Math.max(0, timer.alarmAt - Date.now());
        timer.paused = true;
        timer.remainingMs = remainingMs;

        await this.state.storage.put("timer", timer);
        await this.state.storage.deleteAlarm();

        console.log(`⏸️ Timer paused for order ${timer.orderId} — ${remainingMs}ms remaining`);
        return Response.json({ message: "Timer paused", remainingMs });
    }

    // ═══════════════════════════════════════
    // RESUME — called when dispute is resolved
    // ═══════════════════════════════════════

    private async resumeTimer(): Promise<Response> {
        const timer = await this.state.storage.get<TimerState>("timer");
        if (!timer) {
            return new Response("No active timer", { status: 404 });
        }
        if (!timer.paused) {
            return new Response("Timer is not paused", { status: 409 });
        }

        const alarmAt = Date.now() + (timer.remainingMs || 0);
        timer.paused = false;
        timer.alarmAt = alarmAt;
        delete timer.remainingMs;

        await this.state.storage.put("timer", timer);
        await this.state.storage.setAlarm(alarmAt);

        console.log(`▶️ Timer resumed for order ${timer.orderId} — fires at ${new Date(alarmAt).toISOString()}`);
        return Response.json({ message: "Timer resumed", alarmAt });
    }

    // ═══════════════════════════════════════
    // STATUS — returns current timer info
    // ═══════════════════════════════════════

    private async getStatus(): Promise<Response> {
        const timer = await this.state.storage.get<TimerState>("timer");
        if (!timer) {
            return Response.json({ active: false });
        }

        const now = Date.now();
        const remainingMs = timer.paused
            ? (timer.remainingMs || 0)
            : Math.max(0, timer.alarmAt - now);

        return Response.json({
            active: true,
            orderId: timer.orderId,
            timerType: timer.timerType,
            alarmAt: new Date(timer.alarmAt).toISOString(),
            paused: timer.paused,
            remainingMs,
            expired: !timer.paused && now >= timer.alarmAt,
        });
    }

    // ═══════════════════════════════════════
    // STOCK LOCK (15-min reservation)
    // ═══════════════════════════════════════

    private async lockStock(request: Request): Promise<Response> {
        const { orderId } = await request.json() as { orderId?: string };
        const isLocked = await this.state.storage.get("stock_locked");

        if (isLocked) {
            return new Response("Stock already reserved", { status: 409 });
        }

        await this.state.storage.put("stock_locked", true);
        if (orderId) {
            await this.state.storage.put("stock_order_id", orderId);
        }

        // Set a separate alarm for stock lock — 15 minutes
        // Only set this if there's no active order timer
        const existingTimer = await this.state.storage.get<TimerState>("timer");
        if (!existingTimer) {
            await this.state.storage.setAlarm(Date.now() + 15 * 60 * 1000);
        }

        return new Response("Stock reserved for 15 minutes", { status: 200 });
    }

    // ═══════════════════════════════════════
    // ALARM HANDLER
    // ═══════════════════════════════════════

    async alarm(): Promise<void> {
        const timer = await this.state.storage.get<TimerState>("timer");

        // Handle stock lock expiry (no timer state means it's a stock lock)
        if (!timer) {
            const isLocked = await this.state.storage.get("stock_locked");
            if (isLocked) {
                await this.state.storage.delete("stock_locked");
                await this.state.storage.delete("stock_order_id");
                console.log("🔓 Stock reservation expired");
            }
            return;
        }

        // Timer is paused — do nothing (alarm shouldn't fire, but safety check)
        if (timer.paused) {
            console.log(`⏸️ Alarm fired but timer is paused for order ${timer.orderId}`);
            return;
        }

        // Retry tracking: max 3 retries with 5-min backoff
        const retryCount = (await this.state.storage.get<number>("retry_count")) || 0;
        const MAX_RETRIES = 3;

        const supabase = this.getSupabase();

        try {
            if (timer.timerType === "edd_expiry") {
                await this.handleEddExpiry(supabase, timer);
            } else if (timer.timerType === "dispute_window") {
                await this.handleDisputeWindowExpiry(supabase, timer);
            }

            // Success — clear retry counter
            await this.state.storage.delete("retry_count");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`❌ Alarm handler failed for order ${timer.orderId} (attempt ${retryCount + 1}):`, message);

            if (retryCount < MAX_RETRIES) {
                const backoffMs = 5 * 60 * 1000 * Math.pow(2, retryCount); // 5m, 10m, 20m
                await this.state.storage.put("retry_count", retryCount + 1);
                await this.state.storage.setAlarm(Date.now() + backoffMs);
                console.log(`🔁 Retrying in ${backoffMs / 60000}m (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
            } else {
                console.error(`🚨 All retries exhausted for order ${timer.orderId}. Manual intervention required.`);
                await this.state.storage.delete("retry_count");
                // Leave timer state so admin can investigate
            }
        }
    }

    // ── EDD+24h expired → auto-mark as DELIVERED ──
    private async handleEddExpiry(supabase: any, timer: TimerState): Promise<void> {
        console.log(`📦 EDD+24h expired for order ${timer.orderId} — auto-marking DELIVERED`);

        const { data: order, error: fetchErr } = await supabase
            .from("orders")
            .select("status, is_disputed")
            .eq("id", timer.orderId)
            .single();

        if (fetchErr) throw fetchErr;
        if (!order) {
            console.error(`Order ${timer.orderId} not found in DB`);
            await this.state.storage.delete("timer");
            return;
        }

        // Only auto-deliver if still in SHIPPED status and not disputed
        if (order.status === "SHIPPED" && !order.is_disputed) {
            const { error } = await supabase
                .from("orders")
                .update({
                    status: "DELIVERED",
                    delivered_at: new Date().toISOString(),
                })
                .eq("id", timer.orderId);

            if (error) throw error;

            // Now start the 48h dispute window
            const disputeAlarmAt = Date.now() + 48 * 60 * 60 * 1000;
            const disputeTimer: TimerState = {
                orderId: timer.orderId,
                timerType: "dispute_window",
                alarmAt: disputeAlarmAt,
                paused: false,
            };

            await this.state.storage.put("timer", disputeTimer);
            await this.state.storage.setAlarm(disputeAlarmAt);

            console.log(`⏱️ 48h dispute window started for order ${timer.orderId}`);
        } else {
            console.log(`⏭️ Skipping auto-deliver — order ${timer.orderId} status=${order.status}, disputed=${order.is_disputed}`);
            await this.state.storage.delete("timer");
        }
    }

    // ── 48h dispute window expired → auto-complete ──
    private async handleDisputeWindowExpiry(supabase: any, timer: TimerState): Promise<void> {
        console.log(`✅ 48h dispute window expired for order ${timer.orderId} — auto-completing`);

        const { data: order, error: fetchErr } = await supabase
            .from("orders")
            .select("status, is_disputed")
            .eq("id", timer.orderId)
            .single();

        if (fetchErr) throw fetchErr;
        if (!order) {
            console.error(`Order ${timer.orderId} not found in DB`);
            await this.state.storage.delete("timer");
            return;
        }

        if (order.is_disputed) {
            console.log(`⏭️ Skipping auto-complete — order ${timer.orderId} is disputed`);
            await this.state.storage.delete("timer");
            return;
        }

        if (order.status === "DELIVERED") {
            // Mark order as COMPLETED
            const { error: orderError } = await supabase
                .from("orders")
                .update({ status: "COMPLETED" })
                .eq("id", timer.orderId);

            if (orderError) throw orderError;

            // Update escrow ledger to RELEASE_PENDING
            const { error: ledgerError } = await supabase
                .from("escrow_ledger")
                .update({ status: "RELEASE_PENDING" })
                .eq("order_id", timer.orderId)
                .eq("status", "LOCKED");

            if (ledgerError) {
                console.error(`Failed to update escrow for order ${timer.orderId}:`, ledgerError.message);
                // Don't throw — order status already updated, escrow can be fixed manually
            }

            console.log(`✅ Order ${timer.orderId} auto-completed, escrow → RELEASE_PENDING`);
        }

        // Clean up timer state
        await this.state.storage.delete("timer");
    }
}
