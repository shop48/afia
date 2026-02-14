
import { DurableObject } from "cloudflare:workers";

interface Env {
    // Bindings for other services if needed
}

export class OrderDO extends DurableObject {
    private state: DurableObjectState;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === "/lock-stock") {
            return this.lockStock();
        }

        if (path === "/start-timer") {
            return this.startDisputeTimer();
        }

        return new Response("OrderDO: Unknown Action", { status: 404 });
    }

    async lockStock(): Promise<Response> {
        // 15-minute reservation logic
        const isLocked = await this.state.storage.get("is_locked");
        if (isLocked) {
            return new Response("Stock already reserved", { status: 409 });
        }

        await this.state.storage.put("is_locked", true);
        await this.state.storage.setAlarm(Date.now() + 15 * 60 * 1000); // 15 mins
        return new Response("Stock reserved for 15 minutes", { status: 200 });
    }

    async startDisputeTimer(): Promise<Response> {
        // 48-hour dispute timer
        await this.state.storage.put("status", "DELIVERED");
        // 48 hours in milliseconds
        const timerDuration = 48 * 60 * 60 * 1000;
        await this.state.storage.setAlarm(Date.now() + timerDuration);
        return new Response("Dispute timer started (48h)", { status: 200 });
    }

    async alarm() {
        // Check what triggered the alarm
        const isLocked = await this.state.storage.get("is_locked");
        const status = await this.state.storage.get("status");

        if (isLocked && status !== "PAID") {
            // Expire stock lock
            await this.state.storage.delete("is_locked");
            console.log("Stock reservation expired");
        } else if (status === "DELIVERED") {
            // Auto-release funds
            await this.state.storage.put("status", "COMPLETED");
            // In a real app, this would trigger a webhook or DB update to Supabase
            console.log("Order auto-released");
        }
    }
}
