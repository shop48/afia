
/// <reference types="@cloudflare/workers-types" />

export const checkIdempotency = async (key: string, kv: KVNamespace): Promise<boolean> => {
    // Check if key exists in KV
    const exists = await kv.get(`idempo:${key}`);
    if (exists) {
        return false; // Key used, reject request
    }
    // If not, set it with expiration (e.g., 24 hours)
    await kv.put(`idempo:${key}`, "used", { expirationTtl: 86400 });
    return true;
};

export const checkMargin = (currentRate: number, lockedRate: number): boolean => {
    const diff = Math.abs(currentRate - lockedRate);
    const percentChange = (diff / lockedRate) * 100;

    // If fluctuation is greater than 3%, fail the check
    if (percentChange > 3) {
        return false;
    }
    return true;
};
