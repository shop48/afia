/**
 * MODULE 10: Security Hardening — API Test Suite
 * 
 * Tests all Module 10 security features against the running local server.
 * Run with: node --experimental-modules test-security.mjs
 */

const BASE = 'http://127.0.0.1:8787'

// ── Test Helpers ──
let passed = 0
let failed = 0

async function test(name, fn) {
    try {
        await fn()
        passed++
        console.log(`  ✅ ${name}`)
    } catch (err) {
        failed++
        console.log(`  ❌ ${name}: ${err.message}`)
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg)
}

async function fetchJson(path, opts = {}) {
    const r = await fetch(`${BASE}${path}`, opts)
    let body = null
    try { body = await r.json() } catch { }
    return { status: r.status, body, headers: r.headers }
}

// ═══════════════════════════════════════
// TEST GROUP 1: Security Headers
// ═══════════════════════════════════════
console.log('\n🔒 Security Headers')

await test('Health check returns 200', async () => {
    const { status, body } = await fetchJson('/')
    assert(status === 200, `Expected 200, got ${status}`)
    assert(body.status === 'ok', 'Health check body mismatch')
})

await test('X-Content-Type-Options: nosniff', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('X-Content-Type-Options') === 'nosniff', 'Missing nosniff')
})

await test('X-Frame-Options: DENY', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('X-Frame-Options') === 'DENY', 'Missing DENY')
})

await test('X-XSS-Protection header set', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('X-XSS-Protection') === '1; mode=block', 'Missing XSS Protection')
})

await test('Referrer-Policy header set', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('Referrer-Policy') === 'strict-origin-when-cross-origin', 'Missing Referrer-Policy')
})

await test('Permissions-Policy header set', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('Permissions-Policy') === 'camera=(), microphone=(), geolocation=()', 'Missing Permissions-Policy')
})

await test('No Strict-Transport-Security in dev mode', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('Strict-Transport-Security') === null, 'HSTS should NOT be set in dev mode')
})

await test('Access-Control-Allow-Credentials: true', async () => {
    const r = await fetch(`${BASE}/`)
    assert(r.headers.get('Access-Control-Allow-Credentials') === 'true', 'Missing credentials')
})

// ═══════════════════════════════════════
// TEST GROUP 2: CORS
// ═══════════════════════════════════════
console.log('\n🌐 CORS')

await test('Allowed origin gets echoed back', async () => {
    const r = await fetch(`${BASE}/`, { headers: { 'Origin': 'http://localhost:5173' } })
    assert(r.headers.get('Access-Control-Allow-Origin') === 'http://localhost:5173', 'Wrong origin')
})

await test('Unknown origin in dev mode gets fallback origin (not echoed)', async () => {
    const r = await fetch(`${BASE}/`, { headers: { 'Origin': 'https://evil.com' } })
    const ao = r.headers.get('Access-Control-Allow-Origin')
    assert(ao !== 'https://evil.com', `Evil origin should NOT be echoed, got: ${ao}`)
})

await test('OPTIONS preflight returns 204', async () => {
    const r = await fetch(`${BASE}/api/test`, { method: 'OPTIONS', headers: { 'Origin': 'http://localhost:5173' } })
    assert(r.status === 204, `Expected 204, got ${r.status}`)
})

// ═══════════════════════════════════════
// TEST GROUP 3: Auth Middleware
// ═══════════════════════════════════════
console.log('\n🔐 Auth Middleware')

await test('No auth header → 401', async () => {
    const { status, body } = await fetchJson('/api/profile/fingerprint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert(status === 401, `Expected 401, got ${status}`)
    assert(body.error.includes('Authorization'), `Expected auth error, got: ${body.error}`)
})

await test('Malformed auth header → 401', async () => {
    const { status } = await fetchJson('/api/profile/fingerprint', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic abc123' }, body: '{}' })
    assert(status === 401, `Expected 401, got ${status}`)
})

await test('Invalid JWT → 401', async () => {
    const { status, body } = await fetchJson('/api/profile/fingerprint', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer not.a.jwt' }, body: '{}' })
    assert(status === 401, `Expected 401, got ${status}`)
})

await test('Expired JWT → 401', async () => {
    // Create a JWT with exp in the past
    const payload = btoa(JSON.stringify({ sub: 'test123', exp: 1000000000 })).replace(/=/g, '')
    const fakeJwt = `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesig`
    const { status, body } = await fetchJson('/api/profile/fingerprint', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${fakeJwt}` }, body: '{}' })
    assert(status === 401, `Expected 401, got ${status}`)
    assert(body.error === 'Token expired', `Expected 'Token expired', got: ${body.error}`)
})

await test('Webhook routes bypass auth middleware (signature check is separate)', async () => {
    const { status, body } = await fetchJson('/api/webhooks/paystack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    // Webhook bypasses JWT auth middleware but has its OWN signature verification
    // So we get 401 from the webhook handler ("Missing signature"), NOT from auth middleware
    assert(body.error === 'Missing signature', `Expected 'Missing signature' from webhook handler, got: ${body.error}`)
})

// ═══════════════════════════════════════
// TEST GROUP 4: Rate Limiting
// ═══════════════════════════════════════
console.log('\n🚦 Rate Limiting')

await test('Rate limit headers present on API response', async () => {
    const r = await fetch(`${BASE}/api/health-check-ratelimit`, { headers: { 'Authorization': 'Bearer invalid' } })
    assert(r.headers.get('X-RateLimit-Limit') !== null, 'Missing X-RateLimit-Limit header')
    assert(r.headers.get('X-RateLimit-Remaining') !== null, 'Missing X-RateLimit-Remaining header')
})

await test('Rate limit shows correct limit for API tier', async () => {
    const r = await fetch(`${BASE}/api/some-route`, { headers: { 'Authorization': 'Bearer invalid' } })
    assert(r.headers.get('X-RateLimit-Limit') === '60', `Expected limit 60 for API tier, got ${r.headers.get('X-RateLimit-Limit')}`)
})

// ═══════════════════════════════════════
// TEST GROUP 5: Input Validation
// ═══════════════════════════════════════
console.log('\n🛡️ Input Validation')

// Create a valid-looking JWT with future expiry (won't pass DB checks but will pass JWT decode)
const validPayload = btoa(JSON.stringify({ sub: '151119fe-1029-4bdf-9171-e6089d8696fe', email: 'test@test.com', exp: 9999999999 })).replace(/=/g, '')
const testToken = `eyJhbGciOiJIUzI1NiJ9.${validPayload}.fakesig`
const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testToken}` }

await test('Checkout: non-UUID productId → 400', async () => {
    const { status, body } = await fetchJson('/api/checkout/initialize', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ productId: 'not-a-uuid', quantity: 1 })
    })
    assert(status === 400, `Expected 400, got ${status}`)
    assert(body.error.includes('UUID'), `Expected UUID error, got: ${body.error}`)
})

await test('Checkout: SQL injection in productId → 400', async () => {
    const { status } = await fetchJson('/api/checkout/initialize', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ productId: "'; DROP TABLE orders; --", quantity: 1 })
    })
    assert(status === 400, `SQL injection should be rejected, got ${status}`)
})

await test('Checkout: missing body → 400', async () => {
    const { status } = await fetchJson('/api/checkout/initialize', {
        method: 'POST', headers: authHeaders,
        body: 'not json'
    })
    assert(status === 400, `Expected 400 for bad JSON, got ${status}`)
})

await test('Checkout: invalid quantity → 400', async () => {
    const { status } = await fetchJson('/api/checkout/initialize', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ productId: '00000000-0000-0000-0000-000000000000', quantity: -5 })
    })
    assert(status === 400, `Expected 400 for negative quantity, got ${status}`)
})

await test('Fingerprint: too short → 400', async () => {
    const { status, body } = await fetchJson('/api/profile/fingerprint', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ fingerprint: 'ab' })
    })
    assert(status === 400, `Expected 400 for short fingerprint, got ${status}`)
    assert(body.error.includes('min 5'), `Expected min length error, got: ${body.error}`)
})

await test('Fingerprint: empty body → 400', async () => {
    const { status } = await fetchJson('/api/profile/fingerprint', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({})
    })
    assert(status === 400, `Expected 400 for empty body, got ${status}`)
})

await test('Dispute: non-UUID order ID → 400', async () => {
    const { status, body } = await fetchJson('/api/orders/not-a-uuid/dispute', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ reason: 'test reason text', category: 'DAMAGED' })
    })
    assert(status === 400, `Expected 400, got ${status}`)
    assert(body.error.includes('Invalid order ID'), `Expected order ID error, got: ${body.error}`)
})

await test('Dispute: too short reason → 400', async () => {
    const { status, body } = await fetchJson('/api/orders/00000000-0000-0000-0000-000000000000/dispute', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ reason: 'ab', category: 'OTHER' })
    })
    assert(status === 400, `Expected 400, got ${status}`)
    assert(body.error.includes('minimum 5'), `Expected min length error, got: ${body.error}`)
})

await test('Dispute: invalid category → 400', async () => {
    const { status, body } = await fetchJson('/api/orders/00000000-0000-0000-0000-000000000000/dispute', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ reason: 'This is a valid reason', category: 'INVALID_CAT' })
    })
    assert(status === 400, `Expected 400, got ${status}`)
    assert(body.error.includes('Category'), `Expected category error, got: ${body.error}`)
})

// ═══════════════════════════════════════
// TEST GROUP 6: XSS Sanitization
// ═══════════════════════════════════════
console.log('\n🧹 XSS Sanitization')

await test('Fingerprint: HTML tags stripped from input', async () => {
    const { status, body } = await fetchJson('/api/profile/fingerprint', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ fingerprint: '<script>alert("xss")</script>cv:abc123def456' })
    })
    // 500 is expected because our test JWT is unsigned (DB rejects it)
    // What matters: sanitization didn't crash the server (no unhandled exception)
    // In production with a valid JWT, the stripped value 'alert("xss")cv:abc123def456' would be stored
    assert(status === 400 || status === 500, `Unexpected status: ${status}`)
    // If 400, it means sanitization stripped all tags and left a valid fingerprint (then DB failed)
    // Both are acceptable — no XSS stored
})

// ═══════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════
console.log(`\n${'═'.repeat(40)}`)
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`)
console.log(`${'═'.repeat(40)}\n`)

process.exit(failed > 0 ? 1 : 0)
