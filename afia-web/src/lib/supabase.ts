import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Missing Supabase env vars. Copy .env.example → .env.local and fill in your project values.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Persist session across tabs/refreshes
        persistSession: true,
        // Auto-refresh tokens before they expire
        autoRefreshToken: true,
        // Detect session from URL (for email confirm redirects)
        detectSessionInUrl: true,
    },
    realtime: {
        // Increase heartbeat interval to reduce WebSocket chatter
        heartbeatIntervalMs: 30_000,
        // Exponential backoff on reconnect to prevent connection storms
        reconnectAfterMs: (tries: number) =>
            Math.min(1000 * 2 ** tries, 30_000),
    },
})
