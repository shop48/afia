
import { Hono } from 'hono'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  verifyWebhookSignature, initializeTransaction, generateReference, generateIdempotencyKey,
  verifyTransaction, createRefund, createTransferRecipient, initiateTransfer,
  resolveAccountNumber, listBanks
} from './utils/paystack'
import { checkMarginDrift, getCurrentFxRate, calculateFees, getLiveFxRate, cleanupRateCache } from './utils/margin-guard'
import { notifyUser, createBulkNotifications, getNotificationContent } from './utils/notifications'
import {
  createRecipient as createWiseRecipient, createQuote, createTransfer as createWiseTransfer,
  fundTransfer, getTransfer, verifyWiseWebhookSignature, executeBatchWisePayouts,
  type BatchPayoutItem
} from './utils/wise'
import {
  submitEnhancedKyc, submitBiometricKyc, parseSmileIdCallback,
  verifySmileIdWebhookSignature, getJobStatus,
  type SmileIdCallbackPayload
} from './utils/smileid'
// Module 10: Security Hardening
import { checkRateLimit, getClientIp, getRateLimitForPath } from './utils/rate-limiter'
import { isValidUUID, sanitizeString, sanitizeNumber, isValidUrl, isValidPhone, parseJsonBody } from './utils/validators'
import { checkKycVelocity, notifyVelocityAlert } from './utils/kyc-velocity'

// ══════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_KEY: string            // anon key (for authenticated user operations)
  SUPABASE_SERVICE_KEY: string    // service role key (for webhook operations — bypasses RLS)
  PAYSTACK_SECRET_KEY: string
  FRONTEND_URL: string
  ORDER_DO: DurableObjectNamespace
  ADMIN_MASTER_PASSWORD?: string  // Module 7: master password for batch payout authorization
  // Module 8: Wise (TransferWise) payout integration
  WISE_API_TOKEN?: string
  WISE_PROFILE_ID?: string
  WISE_WEBHOOK_SECRET?: string
  // Module 8: SmileID KYC integration
  SMILEID_PARTNER_ID?: string
  SMILEID_API_KEY?: string
  SMILEID_WEBHOOK_SECRET?: string
  // Module 10: Security Hardening
  ENVIRONMENT?: string            // 'development' | 'production' (controls CORS localhost fallback)
  REQUIRE_MFA?: string            // 'true' to enforce MFA for admin routes
}

interface AuthUser {
  id: string
  email: string
  role?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

type Variables = {
  user: AuthUser
  supabase: SupabaseClient
  userRole: string
  serviceSupabase: SupabaseClient
}

const MAX_QUANTITY = 10
const MIN_AMOUNT_KOBO = 10000  // Paystack minimum: ₦100

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ══════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════

app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.path} →`, err.message)
  return c.json({ error: 'Internal server error' }, 500)
})

// ══════════════════════════════════════════════
// MODULE 10: CORS — Production-hardened with
// environment-aware origin restriction
// ══════════════════════════════════════════════

app.use('*', async (c, next) => {
  const isDev = c.env.ENVIRONMENT !== 'production'

  // Production: ONLY allow the configured FRONTEND_URL
  // Development: also allow localhost origins for dev servers
  const allowedOrigins = isDev
    ? [
      c.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:4173',
    ]
    : [c.env.FRONTEND_URL].filter(Boolean)

  const origin = c.req.header('Origin') || ''
  const isAllowed = allowedOrigins.includes(origin)
  const allowedOrigin = isAllowed ? origin : (allowedOrigins[0] || '')

  // CORS headers
  c.header('Access-Control-Allow-Origin', allowedOrigin)
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Allow-Credentials', 'true')
  c.header('Access-Control-Max-Age', '86400')

  // Module 10: Security headers
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (!isDev) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }

  // Reject requests from disallowed origins in production (non-OPTIONS)
  if (!isDev && origin && !isAllowed) {
    console.warn(`🚫 CORS: Blocked request from origin ${origin}`)
    return c.json({ error: 'Origin not allowed' }, 403)
  }

  await next()
})

// ══════════════════════════════════════════════
// MODULE 10: RATE LIMITING MIDDLEWARE
// Sliding-window per-IP rate limiter
// ══════════════════════════════════════════════

app.use('/api/*', async (c, next) => {
  const ip = getClientIp(c.req.raw)
  const path = c.req.path
  const config = getRateLimitForPath(path)
  const key = `${ip}:${path.split('/').slice(0, 4).join('/')}`

  const result = checkRateLimit(key, config)

  c.header('X-RateLimit-Limit', String(config.maxRequests))
  c.header('X-RateLimit-Remaining', String(result.remaining))

  if (!result.allowed) {
    c.header('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)))
    console.warn(`🚦 Rate limited: ${ip} on ${path}`)
    return c.json({ error: 'Too many requests. Please slow down.' }, 429)
  }

  await next()
})

// ══════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'afia-api', version: '0.4.1' })
})

// ══════════════════════════════════════════════
// AUTH MIDDLEWARE (for /api/* routes)
// Decodes JWT locally — no network call needed.
// The JWT was already validated by the Supabase
// client on the frontend. We just extract the
// user ID and create an RLS-scoped client.
// ══════════════════════════════════════════════

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    // Base64url → Base64 → decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

app.use('/api/*', async (c, next) => {
  // Skip auth for webhook routes — Paystack calls these directly
  if (c.req.path.startsWith('/api/webhooks/')) {
    return next()
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401)
  }

  const token = authHeader.slice(7)
  if (!token) {
    return c.json({ error: 'Empty token' }, 401)
  }

  // Decode JWT locally — FAST, no network call
  const payload = decodeJwtPayload(token)
  if (!payload?.sub) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Check expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return c.json({ error: 'Token expired' }, 401)
  }

  // Build user object from JWT claims
  const user: AuthUser = {
    id: payload.sub,
    email: payload.email || '',
    user_metadata: payload.user_metadata || {},
    app_metadata: payload.app_metadata || {},
  }

  // Create an RLS-scoped client with the user's JWT
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  c.set('user', user)
  c.set('supabase', supabase)
  await next()
})

// ══════════════════════════════════════════════
// ADMIN MIDDLEWARE — fetch profile role ONCE for
// all /api/admin/* routes (avoids duplicate queries)
// ══════════════════════════════════════════════

app.use('/api/admin/*', async (c, next) => {
  const user = c.get('user')
  const serviceSupabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)

  // Single DB query to get the user's role
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'BUYER'
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403)
  }

  // Module 10: MFA enforcement for admin routes
  // When REQUIRE_MFA is 'true', check that the JWT has aal2 assurance
  // (meaning the user completed TOTP verification in this session)
  if (c.env.REQUIRE_MFA === 'true') {
    const authHeader = c.req.header('Authorization') || ''
    const token = authHeader.slice(7)
    const payload = decodeJwtPayload(token)

    // Check amr (Authentication Methods Reference) claims for MFA
    const amr = payload?.amr as Array<{ method: string }> | undefined
    const hasMfa = amr?.some((m) => m.method === 'totp') ?? false

    if (!hasMfa) {
      return c.json({
        error: 'MFA required for admin access. Please set up MFA at /admin/mfa-setup.',
        mfa_required: true,
      }, 403)
    }
  }

  c.set('userRole', role)
  c.set('serviceSupabase', serviceSupabase)
  await next()
})

// ══════════════════════════════════════════════
// MODULE 4: CHECKOUT — Initialize Payment
// POST /api/checkout/initialize
// ══════════════════════════════════════════════

app.post('/api/checkout/initialize', async (c) => {
  const user = c.get('user')

  // Parse & validate body
  let body: { productId?: string; quantity?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { productId, quantity } = body

  if (!productId || !isValidUUID(productId)) {
    return c.json({ error: 'productId is required and must be a valid UUID' }, 400)
  }

  const qty = Number(quantity) || 0
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
    return c.json({ error: `quantity must be an integer between 1 and ${MAX_QUANTITY}` }, 400)
  }

  const supabase = c.get('supabase')

  // 1. Fetch product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*, vendor:profiles!products_vendor_id_fkey(id, full_name, settlement_currency)')
    .eq('id', productId)
    .eq('is_active', true)
    .single()

  if (productError || !product) {
    return c.json({ error: 'Product not found or inactive' }, 404)
  }

  // 2. Prevent self-purchase
  const vendor = Array.isArray(product.vendor) ? product.vendor[0] : product.vendor
  if (vendor?.id === user.id) {
    return c.json({ error: 'You cannot purchase your own product' }, 403)
  }

  // 3. Stock check
  if (product.stock_count < qty) {
    return c.json({ error: `Insufficient stock. Only ${product.stock_count} available.` }, 409)
  }

  // 4. Calculate totals
  const unitPrice = Number(product.base_price)
  if (unitPrice <= 0 || !Number.isFinite(unitPrice)) {
    return c.json({ error: 'Invalid product price' }, 500)
  }

  const subtotal = unitPrice * qty

  // Snapshot FX rate at checkout for Margin Guard
  // Module 8: Use live Wise API rate (with 5-min cache), fallback to static
  const fxRate = await getLiveFxRate(product.currency || 'USD', 'NGN', c.env.WISE_API_TOKEN)

  // Convert to NGN for Paystack (Paystack only accepts NGN amounts in kobo)
  let amountNGN: number
  if (product.currency === 'NGN') {
    amountNGN = subtotal
  } else {
    if (!fxRate) {
      return c.json({ error: `Unsupported currency: ${product.currency}` }, 400)
    }
    amountNGN = subtotal * fxRate * 1.03 // Apply 3% volatility buffer
  }

  const amountKobo = Math.round(amountNGN * 100)

  // 5. Enforce Paystack minimum
  if (amountKobo < MIN_AMOUNT_KOBO) {
    return c.json({ error: `Minimum payment is ₦100. Current total: ₦${(amountKobo / 100).toFixed(2)}` }, 400)
  }

  // 6. Generate reference and idempotency key
  const reference = generateReference()
  const idempotencyKey = generateIdempotencyKey()

  // 7. Initialize Paystack transaction
  try {
    const paystackData = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      reference,
      callbackUrl: `${c.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/callback`,
      secretKey: c.env.PAYSTACK_SECRET_KEY,
      metadata: {
        product_id: productId,
        buyer_id: user.id,
        vendor_id: vendor?.id,
        quantity: qty,
        unit_price: unitPrice,
        currency: product.currency,
        fx_rate: fxRate,
        idempotency_key: idempotencyKey,
      },
    })

    return c.json({
      authorization_url: paystackData.authorization_url,
      access_code: paystackData.access_code,
      reference: paystackData.reference,
      amount_ngn: Math.round(amountNGN * 100) / 100,
      amount_kobo: amountKobo,
      fx_rate: fxRate,
      idempotency_key: idempotencyKey,
      product: {
        id: product.id,
        title: product.title,
        base_price: unitPrice,
        currency: product.currency,
        vendor_name: vendor?.full_name || null,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment initialization failed'
    console.error('Paystack init error:', message)
    // Don't leak internal Paystack errors to the client
    return c.json({ error: 'Failed to initialize payment. Please try again.' }, 502)
  }
})

// ══════════════════════════════════════════════
// MODULE 4: PAYSTACK WEBHOOK
// POST /api/webhooks/paystack
// NO AUTH — verified via HMAC signature
// ══════════════════════════════════════════════

app.post('/api/webhooks/paystack', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-paystack-signature')

  // 1. Require signature header
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401)
  }

  // 2. Verify webhook signature (constant-time comparison)
  const isValid = await verifyWebhookSignature(rawBody, signature, c.env.PAYSTACK_SECRET_KEY)
  if (!isValid) {
    console.error('Invalid Paystack webhook signature')
    return c.json({ error: 'Invalid signature' }, 401)
  }

  // 3. Parse payload safely
  let payload: {
    event: string
    data: {
      reference: string
      amount: number
      currency: string
      status: string
      metadata?: {
        product_id?: string
        buyer_id?: string
        vendor_id?: string
        quantity?: number
        unit_price?: number
        currency?: string
        fx_rate?: number | null
        idempotency_key?: string
      }
    }
  }

  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('Malformed webhook payload')
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // 4. Only process successful charges
  if (payload.event !== 'charge.success') {
    return c.json({ message: 'Event ignored' }, 200)
  }

  const { data } = payload
  const meta = data.metadata

  // 5. Validate required metadata
  if (!meta?.product_id || !meta?.buyer_id || !meta?.vendor_id) {
    console.error('Webhook missing required metadata:', data.reference)
    return c.json({ error: 'Missing metadata' }, 400)
  }

  const qty = Number(meta.quantity) || 1

  // Use service role key to bypass RLS (webhook has no user session)
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)

  // 6. Idempotency check — reject if order with this paystack_ref already exists
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('paystack_ref', data.reference)
    .maybeSingle()

  if (existingOrder) {
    console.log(`Duplicate webhook for ref ${data.reference}, skipping`)
    return c.json({ message: 'Already processed' }, 200)
  }

  // 7. Create Order
  const grossAmount = data.amount / 100 // Convert kobo to Naira
  const { feeAmount, netPayout } = calculateFees(grossAmount)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id: meta.buyer_id,
      vendor_id: meta.vendor_id,
      product_id: meta.product_id,
      status: 'PAID',
      paystack_ref: data.reference,
      quantity: qty,
      total_amount: grossAmount,
      currency: data.currency || 'NGN',
      fx_rate_at_checkout: meta.fx_rate ?? null,
      idempotency_key: meta.idempotency_key ?? null,
    })
    .select('id')
    .single()

  if (orderError) {
    // If it's a unique constraint violation, it's a duplicate
    if (orderError.code === '23505') {
      console.log(`Duplicate insert for ref ${data.reference}, skipping`)
      return c.json({ message: 'Already processed' }, 200)
    }
    console.error('Order creation failed:', orderError.message)
    return c.json({ error: 'Order creation failed' }, 500)
  }

  // 8. Determine payout rail from vendor profile
  const { data: vendorProfile } = await supabase
    .from('profiles')
    .select('settlement_currency')
    .eq('id', meta.vendor_id)
    .single()

  const payoutRail = vendorProfile?.settlement_currency === 'NGN' ? 'PAYSTACK_NGN' : 'WISE_GLOBAL'

  // 9. Run Margin Guard
  const currentRate = getCurrentFxRate(meta.currency || 'USD', 'NGN')
  let marginPassed = true
  if (meta.fx_rate && currentRate) {
    const marginResult = checkMarginDrift(meta.fx_rate, currentRate)
    marginPassed = marginResult.passed
    if (!marginPassed) {
      console.warn(`⚠️ Margin Guard FAILED for order ${order.id}: drift=${marginResult.drift}`)
    }
  }

  // 10. Create Escrow Ledger entry (LOCKED)
  const { error: ledgerError } = await supabase
    .from('escrow_ledger')
    .insert({
      order_id: order.id,
      gross_amount: grossAmount,
      fee_amount: feeAmount,
      net_payout: netPayout,
      status: 'LOCKED',
      payout_rail_type: payoutRail,
      margin_check_passed: marginPassed,
    })

  if (ledgerError) {
    console.error('Escrow ledger creation failed:', ledgerError.message)
  }

  // 11. Atomic stock decrement via RPC — race-condition safe
  const { data: decremented, error: stockError } = await supabase.rpc('decrement_stock_safe', {
    p_product_id: meta.product_id,
    p_quantity: qty,
  })

  if (stockError) {
    // Fallback: manual decrement (less safe, but keeps things working)
    console.warn('RPC decrement_stock_safe failed, using fallback:', stockError.message)
    const { data: currentProduct } = await supabase
      .from('products')
      .select('stock_count')
      .eq('id', meta.product_id)
      .single()

    if (currentProduct) {
      await supabase
        .from('products')
        .update({ stock_count: Math.max(0, currentProduct.stock_count - qty) })
        .eq('id', meta.product_id)
    }
  } else if (!decremented) {
    console.warn(`Stock decrement returned false for product ${meta.product_id} — possibly out of stock`)
  }

  console.log(`✅ Order ${order.id} created | Escrow LOCKED | Ref: ${data.reference}`)

  // ── MODULE 10: KYC Velocity Check ──
  // Flags vendors who exceed $500 in sales within their first 48 hours
  try {
    const fxRateForVelocity = meta.fx_rate ?? getCurrentFxRate('USD', 'NGN') ?? 1580
    const velocityResult = await checkKycVelocity(
      supabase,
      meta.vendor_id,
      grossAmount,
      fxRateForVelocity
    )

    if (velocityResult.flagged) {
      console.warn(
        `🚨 KYC VELOCITY: Vendor ${meta.vendor_id} flagged — ` +
        `$${velocityResult.totalSalesUsd.toFixed(2)} in ${velocityResult.vendorAge.toFixed(1)}h`
      )
      await notifyVelocityAlert(supabase, meta.vendor_id, velocityResult)
    }
  } catch (velocityErr) {
    console.error('KYC velocity check failed (non-critical):', velocityErr)
    // Non-critical — don't fail the webhook
  }

  // ── MODULE 9: Notify buyer + vendor ──
  try {
    const { data: product } = await supabase
      .from('products')
      .select('title')
      .eq('id', meta.product_id)
      .maybeSingle()

    const orderCtx = {
      orderId: order.id,
      productTitle: product?.title || 'your item',
      amount: grossAmount,
      currency: data.currency || 'NGN',
    }

    await createBulkNotifications(supabase, [
      {
        userId: meta.buyer_id,
        type: 'ORDER_CONFIRMED',
        ...getNotificationContent('ORDER_CONFIRMED', orderCtx),
        metadata: { order_id: order.id, product_title: orderCtx.productTitle },
      },
      {
        userId: meta.vendor_id,
        type: 'NEW_ORDER',
        ...getNotificationContent('NEW_ORDER', orderCtx),
        metadata: { order_id: order.id, product_title: orderCtx.productTitle },
      },
    ])
  } catch (notifErr) {
    console.error('Failed to send order notifications:', notifErr)
    // Non-critical — don't fail the webhook
  }

  return c.json({ message: 'Webhook processed', orderId: order.id }, 200)
})

// ══════════════════════════════════════════════
// MODULE 8: WISE WEBHOOK
// POST /api/webhooks/wise
// NO AUTH — verified via signature
// ══════════════════════════════════════════════

app.post('/api/webhooks/wise', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-signature-sha256') || c.req.header('X-Signature-SHA256') || ''

  const wiseToken = c.env.WISE_API_TOKEN
  if (!wiseToken) {
    console.error('WISE_API_TOKEN not configured')
    return c.json({ error: 'Server misconfiguration' }, 500)
  }

  // Verify signature (set sandboxMode to false for production)
  const sandboxMode = wiseToken.startsWith('YOUR_') || !c.env.WISE_WEBHOOK_SECRET
  const isValid = await verifyWiseWebhookSignature(rawBody, signature, wiseToken, sandboxMode)
  if (!isValid) {
    console.error('Invalid Wise webhook signature')
    return c.json({ error: 'Invalid signature' }, 401)
  }

  let payload: {
    event_type: string
    data: {
      resource: {
        id: number
        profile_id: number
        type: string
      }
      current_state: string
      previous_state: string
    }
  }

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // Only handle transfer state changes
  if (payload.event_type !== 'transfers#state-change') {
    return c.json({ message: 'Event ignored' }, 200)
  }

  const { current_state, resource } = payload.data
  const transferId = resource.id

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)

  // Find the escrow entry with this Wise transfer ID
  const { data: escrow } = await supabase
    .from('escrow_ledger')
    .select('id, order_id, status')
    .eq('wise_transfer_id', String(transferId))
    .maybeSingle()

  if (!escrow) {
    console.warn(`Wise webhook: no escrow found for transfer ${transferId}`)
    return c.json({ message: 'Transfer not tracked' }, 200)
  }

  // Update escrow with new Wise status
  const updatePayload: Record<string, unknown> = {
    wise_transfer_status: current_state,
  }

  // Map Wise states to escrow actions
  if (current_state === 'outgoing_payment_sent') {
    // Money has been sent to the vendor
    updatePayload.status = 'RELEASED'
    updatePayload.payout_executed_at = new Date().toISOString()

    // Also update order to COMPLETED
    await supabase
      .from('orders')
      .update({ status: 'COMPLETED' })
      .eq('id', escrow.order_id)

    // ── MODULE 9: Notify vendor of payout ──
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('vendor_id, product:products(title), total_amount, currency')
        .eq('id', escrow.order_id)
        .maybeSingle()

      if (orderData?.vendor_id) {
        const product = Array.isArray(orderData.product) ? orderData.product[0] : orderData.product
        await notifyUser(supabase, orderData.vendor_id, 'PAYOUT_RELEASED', {
          orderId: escrow.order_id,
          productTitle: product?.title,
          amount: orderData.total_amount,
          currency: orderData.currency,
        })
      }
    } catch (notifErr) {
      console.error('Failed to send payout notification:', notifErr)
    }
  } else if (current_state === 'funds_refunded' || current_state === 'cancelled') {
    // Transfer was refunded/cancelled
    updatePayload.status = 'FROZEN'
  }

  await supabase
    .from('escrow_ledger')
    .update(updatePayload)
    .eq('id', escrow.id)

  console.log(`🌍 Wise webhook: transfer ${transferId} → ${current_state} | escrow ${escrow.id}`)
  return c.json({ message: 'Wise webhook processed' }, 200)
})

// ══════════════════════════════════════════════
// MODULE 8: SMILEID WEBHOOK
// POST /api/webhooks/smileid
// NO AUTH — verified via HMAC signature
// ══════════════════════════════════════════════

app.post('/api/webhooks/smileid', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-smileid-signature') || c.req.header('signature') || ''

  const apiKey = c.env.SMILEID_API_KEY
  if (!apiKey) {
    console.error('SMILEID_API_KEY not configured')
    return c.json({ error: 'Server misconfiguration' }, 500)
  }

  // Verify signature
  const isValid = await verifySmileIdWebhookSignature(rawBody, signature, apiKey)
  const isSandbox = apiKey.startsWith('YOUR_') || apiKey.length < 10
  if (!isValid) {
    if (isSandbox) {
      console.warn('[SmileID Webhook] Signature verification failed — allowing in sandbox mode')
    } else {
      console.error('[SmileID Webhook] Signature verification FAILED — rejecting in production mode')
      return c.json({ error: 'Invalid signature' }, 401)
    }
  }

  let payload: SmileIdCallbackPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // Parse the verification result
  const result = parseSmileIdCallback(payload)
  const userId = payload.PartnerParams?.user_id

  if (!userId) {
    console.error('SmileID webhook missing user_id in PartnerParams')
    return c.json({ error: 'Missing user_id' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)

  // Update the user's KYC level based on verification result
  const updatePayload: Record<string, unknown> = {
    smileid_job_id: result.jobId,
  }

  if (result.verified) {
    updatePayload.kyc_level = 'VERIFIED'
    updatePayload.kyc_verified_at = new Date().toISOString()
    updatePayload.kyc_rejection_reason = null
    console.log(`✅ SmileID: User ${userId} KYC VERIFIED (job: ${result.jobId})`)
  } else {
    updatePayload.kyc_level = 'REJECTED'
    updatePayload.kyc_rejection_reason = result.resultText || `Failed: ${result.resultCode}`
    console.warn(`❌ SmileID: User ${userId} KYC REJECTED — ${result.resultText} (code: ${result.resultCode})`)
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to update KYC status:', updateError.message)
    return c.json({ error: 'Failed to update profile' }, 500)
  }

  // ── MODULE 9: Notify vendor of KYC status ──
  try {
    await notifyUser(supabase, userId, 'KYC_STATUS', {}, {
      verified: result.verified,
      result_text: result.resultText,
    })
  } catch (notifErr) {
    console.error('Failed to send KYC notification:', notifErr)
  }

  return c.json({ message: 'SmileID webhook processed', verified: result.verified }, 200)
})

// ══════════════════════════════════════════════
// MODULE 8: PAYSTACK VERIFY TRANSACTION
// POST /api/checkout/verify
// Buyer — server-side verification after popup callback
// ══════════════════════════════════════════════

app.post('/api/checkout/verify', async (c) => {
  let body: { reference?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { reference } = body
  if (!reference || typeof reference !== 'string' || reference.length > 100) {
    return c.json({ error: 'Valid reference is required' }, 400)
  }

  try {
    const verification = await verifyTransaction(reference, c.env.PAYSTACK_SECRET_KEY)

    return c.json({
      verified: verification.status === 'success',
      status: verification.status,
      amount: verification.amount,
      currency: verification.currency,
      reference: verification.reference,
      channel: verification.channel,
      paid_at: verification.paid_at,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    console.error('Paystack verify error:', message)
    return c.json({ error: 'Payment verification failed' }, 502)
  }
})

// ══════════════════════════════════════════════
// MODULE 8: LIVE FX RATES
// GET /api/fx-rates?from=USD&to=NGN
// Public endpoint (authenticated user)
// ══════════════════════════════════════════════

app.get('/api/fx-rates', async (c) => {
  const from = (c.req.query('from') || 'USD').toUpperCase()
  const to = (c.req.query('to') || 'NGN').toUpperCase()

  const liveRate = await getLiveFxRate(from, to, c.env.WISE_API_TOKEN)
  const fallbackRate = getCurrentFxRate(from, to)

  // Clean up stale cache entries periodically
  cleanupRateCache()

  return c.json({
    from,
    to,
    rate: liveRate || fallbackRate,
    source: liveRate ? 'wise_live' : 'fallback_static',
    cached: liveRate !== null,
    timestamp: new Date().toISOString(),
  })
})

// ══════════════════════════════════════════════
// MODULE 8: LIST BANKS (for vendor setup)
// GET /api/banks?country=nigeria&currency=NGN
// ══════════════════════════════════════════════

app.get('/api/banks', async (c) => {
  const country = c.req.query('country') || 'nigeria'
  const currency = c.req.query('currency') || 'NGN'

  try {
    const banks = await listBanks(c.env.PAYSTACK_SECRET_KEY, country, currency)
    return c.json({ banks })
  } catch (err) {
    console.error('Failed to list banks:', err)
    return c.json({ error: 'Failed to fetch bank list' }, 502)
  }
})

// ══════════════════════════════════════════════
// MODULE 8: VENDOR BANK ACCOUNT SETUP
// POST /api/vendor/bank-account
// Vendor only — setup bank account for payouts
// ══════════════════════════════════════════════

app.post('/api/vendor/bank-account', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  let body: { accountNumber?: string; bankCode?: string; bankName?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { accountNumber, bankCode, bankName } = body

  if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return c.json({ error: 'Account number must be exactly 10 digits' }, 400)
  }
  if (!bankCode || typeof bankCode !== 'string' || bankCode.length > 20) {
    return c.json({ error: 'Bank code is required' }, 400)
  }
  const safeBankName = bankName ? sanitizeString(bankName, 100) : null

  // Step 1: Verify the account with Paystack (prevents wrong payouts)
  let resolvedName: string
  try {
    const resolved = await resolveAccountNumber(accountNumber, bankCode, c.env.PAYSTACK_SECRET_KEY)
    resolvedName = resolved.account_name
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account verification failed'
    return c.json({ error: `Bank account verification failed: ${message}` }, 400)
  }

  // Step 2: Create a Paystack transfer recipient
  let recipientCode: string | null = null
  try {
    const recipient = await createTransferRecipient({
      type: 'nuban',
      name: resolvedName,
      accountNumber,
      bankCode,
      currency: 'NGN',
      description: `Afia vendor: ${user.id}`,
      secretKey: c.env.PAYSTACK_SECRET_KEY,
    })
    recipientCode = recipient.recipient_code
  } catch (err) {
    console.error('Failed to create Paystack recipient:', err)
    // Non-fatal — we can retry later
  }

  // Step 3: Save to profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      bank_account_number: accountNumber,
      bank_code: bankCode,
      bank_name: safeBankName,
      bank_account_name: resolvedName,
      ...(recipientCode ? { paystack_recipient_code: recipientCode } : {}),
    })
    .eq('id', user.id)

  if (updateError) {
    return c.json({ error: 'Failed to save bank account' }, 500)
  }

  return c.json({
    message: 'Bank account verified and saved',
    account_name: resolvedName,
    bank_name: safeBankName,
    bank_code: bankCode,
    recipient_code: recipientCode,
  })
})

// ══════════════════════════════════════════════
// MODULE 8: KYC SUBMISSION (SmileID)
// POST /api/kyc/submit
// Vendor only — submit BVN for enhanced KYC
// ══════════════════════════════════════════════

app.post('/api/kyc/submit', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  // Check that SmileID is configured
  const partnerId = c.env.SMILEID_PARTNER_ID
  const apiKey = c.env.SMILEID_API_KEY
  if (!partnerId || !apiKey) {
    return c.json({ error: 'KYC service not configured' }, 503)
  }

  let body: {
    idType?: string
    idNumber?: string
    firstName?: string
    lastName?: string
    dob?: string
    country?: string
    selfieImage?: string
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { idType, idNumber, firstName, lastName, dob, country, selfieImage } = body

  if (!idType || !['BVN', 'NIN', 'VOTER_ID', 'DRIVERS_LICENSE', 'PASSPORT'].includes(idType)) {
    return c.json({ error: 'Valid ID type is required (BVN, NIN, VOTER_ID, DRIVERS_LICENSE, or PASSPORT)' }, 400)
  }
  if (!idNumber || typeof idNumber !== 'string' || idNumber.length < 5) {
    return c.json({ error: 'Valid ID number is required' }, 400)
  }

  // Check existing KYC status
  const { data: profile } = await supabase
    .from('profiles')
    .select('kyc_level, smileid_job_id')
    .eq('id', user.id)
    .single()

  if (profile?.kyc_level === 'VERIFIED') {
    return c.json({ error: 'KYC already verified' }, 409)
  }

  // Build callback URL — use the Worker's own origin, not the frontend
  const requestUrl = new URL(c.req.url)
  const callbackUrl = `${requestUrl.origin}/api/webhooks/smileid`

  try {
    // Determine which KYC type to use
    let result
    if (selfieImage) {
      // Biometric KYC (BVN + selfie)
      result = await submitBiometricKyc({
        partnerId,
        userId: user.id,
        jobType: 'biometric_kyc',
        country: country || 'NG',
        idType,
        idNumber,
        firstName,
        lastName,
        dob,
        selfieImage,
      }, apiKey, callbackUrl)
    } else {
      // Enhanced KYC (ID number only)
      result = await submitEnhancedKyc({
        partnerId,
        userId: user.id,
        jobType: 'enhanced_kyc',
        country: country || 'NG',
        idType,
        idNumber,
        firstName,
        lastName,
        dob,
      }, apiKey, callbackUrl)
    }

    // Store the job ID for tracking
    await supabase
      .from('profiles')
      .update({
        smileid_job_id: result.smile_job_id,
        kyc_submitted_at: new Date().toISOString(),
        kyc_level: 'PENDING',
      })
      .eq('id', user.id)

    return c.json({
      message: 'KYC verification submitted',
      job_id: result.smile_job_id,
      status: 'PENDING',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'KYC submission failed'
    console.error('SmileID KYC error:', message)
    return c.json({ error: `KYC submission failed: ${message}` }, 502)
  }
})

// ══════════════════════════════════════════════
// MODULE 8: KYC STATUS POLLING (fallback)
// GET /api/kyc/status
// ══════════════════════════════════════════════

app.get('/api/kyc/status', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kyc_level, smileid_job_id, kyc_submitted_at, kyc_verified_at, kyc_rejection_reason')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return c.json({ error: 'Profile not found' }, 404)
  }

  // If pending and we have config, try polling SmileID
  if (profile.kyc_level === 'PENDING' && profile.smileid_job_id && c.env.SMILEID_PARTNER_ID && c.env.SMILEID_API_KEY) {
    try {
      const result = await getJobStatus(
        c.env.SMILEID_PARTNER_ID,
        profile.smileid_job_id,
        user.id,
        c.env.SMILEID_API_KEY
      )

      if (result) {
        // Update profile based on poll result
        const serviceSupabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)
        if (result.verified) {
          await serviceSupabase.from('profiles').update({
            kyc_level: 'VERIFIED',
            kyc_verified_at: new Date().toISOString(),
            kyc_rejection_reason: null,
          }).eq('id', user.id)
          return c.json({ kyc_level: 'VERIFIED', verified: true })
        } else {
          await serviceSupabase.from('profiles').update({
            kyc_level: 'REJECTED',
            kyc_rejection_reason: result.resultText,
          }).eq('id', user.id)
          return c.json({ kyc_level: 'REJECTED', reason: result.resultText })
        }
      }
    } catch (err) {
      console.warn('SmileID poll failed:', err)
      // Fall through to return current status
    }
  }

  return c.json({
    kyc_level: profile.kyc_level || 'NONE',
    job_id: profile.smileid_job_id,
    submitted_at: profile.kyc_submitted_at,
    verified_at: profile.kyc_verified_at,
    rejection_reason: profile.kyc_rejection_reason,
  })
})
// ══════════════════════════════════════════════
// MODULE 4: GET ORDER BY REFERENCE
// GET /api/orders/by-ref/:reference
// ══════════════════════════════════════════════

app.get('/api/orders/by-ref/:reference', async (c) => {
  const reference = c.req.param('reference')
  const user = c.get('user')

  if (!reference || reference.length > 100) {
    return c.json({ error: 'Invalid reference' }, 400)
  }

  const supabase = c.get('supabase')
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, status, paystack_ref, total_amount, currency, quantity,
      fx_rate_at_checkout, created_at,
      product:products(title, images, base_price, currency),
      escrow:escrow_ledger(gross_amount, fee_amount, net_payout, status, margin_check_passed)
    `)
    .eq('paystack_ref', reference)
    .eq('buyer_id', user.id)
    .single()

  if (error || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }

  return c.json(order)
})

// ══════════════════════════════════════════════
// MODULE 4: GET BUYER ORDERS (paginated)
// GET /api/orders?page=1&limit=20
// ══════════════════════════════════════════════

// (duplicate buyer orders endpoint removed — see below)


app.get('/api/orders', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20))
  const offset = (page - 1) * limit

  const { data: orders, error, count } = await supabase
    .from('orders')
    .select(`
      id, status, paystack_ref, total_amount, currency, quantity,
      shipping_type, waybill_url, courier_phone, tracking_id,
      estimated_delivery_date, shipped_at, delivered_at, auto_release_at,
      is_disputed, created_at,
      product:products(id, title, images, base_price, currency),
      escrow:escrow_ledger(gross_amount, fee_amount, net_payout, status),
      vendor:profiles!orders_vendor_id_fkey(id, full_name)
    `, { count: 'exact' })
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return c.json({ error: 'Failed to fetch orders' }, 500)
  }

  return c.json({
    orders: orders || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
})

// ══════════════════════════════════════════════
// MODULE 5: VENDOR ORDERS LIST
// GET /api/vendor/orders?status=PAID&page=1&limit=20
// ══════════════════════════════════════════════

app.get('/api/vendor/orders', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20))
  const offset = (page - 1) * limit
  const statusFilter = c.req.query('status') // optional: PAID, SHIPPED, DELIVERED, etc.
  const VALID_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED']
  if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
    return c.json({ error: `Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}` }, 400)
  }

  let query = supabase
    .from('orders')
    .select(`
      id, status, paystack_ref, total_amount, currency, quantity,
      shipping_type, waybill_url, courier_phone, tracking_id,
      estimated_delivery_date, shipped_at, delivered_at, auto_release_at,
      is_disputed, created_at,
      product:products(id, title, images, base_price, currency),
      escrow:escrow_ledger(gross_amount, fee_amount, net_payout, status),
      buyer:profiles!orders_buyer_id_fkey(id, full_name)
    `, { count: 'exact' })
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: orders, error, count } = await query

  if (error) {
    return c.json({ error: 'Failed to fetch vendor orders' }, 500)
  }

  return c.json({
    orders: orders || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
})

// ══════════════════════════════════════════════
// MODULE 5: SINGLE ORDER DETAIL
// GET /api/orders/:id
// ══════════════════════════════════════════════

app.get('/api/orders/:id', async (c) => {
  const orderId = c.req.param('id')
  const user = c.get('user')
  const supabase = c.get('supabase')

  if (!orderId || orderId.length > 50) {
    return c.json({ error: 'Invalid order ID' }, 400)
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, status, paystack_ref, total_amount, currency, quantity,
      shipping_type, waybill_url, courier_phone, tracking_id,
      estimated_delivery_date, shipped_at, delivered_at, auto_release_at,
      is_disputed, created_at,
      product:products(id, title, images, base_price, currency, description),
      escrow:escrow_ledger(gross_amount, fee_amount, net_payout, status, margin_check_passed),
      vendor:profiles!orders_vendor_id_fkey(id, full_name, kyc_level),
      buyer:profiles!orders_buyer_id_fkey(id, full_name)
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }

  // Only buyer or vendor can see their own order
  const vendor = Array.isArray(order.vendor) ? order.vendor[0] : order.vendor
  const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer
  if (vendor?.id !== user.id && buyer?.id !== user.id) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  return c.json(order)
})

// ══════════════════════════════════════════════
// MODULE 5: LOGISTICS — RAIL 1 (API Tracking)
// POST /api/logistics/rail1
// Vendor only — order must be in PAID status
// ══════════════════════════════════════════════

app.post('/api/logistics/rail1', async (c) => {
  const user = c.get('user')
  let body: { orderId?: string; trackingId?: string; carrier?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { orderId, trackingId, carrier } = body

  if (!orderId || typeof orderId !== 'string') {
    return c.json({ error: 'orderId is required' }, 400)
  }
  if (!trackingId || typeof trackingId !== 'string' || trackingId.length > 100) {
    return c.json({ error: 'trackingId is required and must be under 100 characters' }, 400)
  }

  const supabase = c.get('supabase')

  // Verify vendor ownership and status
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, vendor_id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }
  if (order.vendor_id !== user.id) {
    return c.json({ error: 'Only the vendor can fulfill this order' }, 403)
  }
  if (order.status !== 'PAID') {
    return c.json({ error: `Cannot ship: order status is ${order.status}, expected PAID` }, 409)
  }

  // Update order to SHIPPED
  const { error } = await supabase
    .from('orders')
    .update({
      shipping_type: 'API_AUTOMATED',
      tracking_id: trackingId,
      carrier_name: carrier || null,
      status: 'SHIPPED',
      shipped_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  // ── MODULE 9: Notify buyer that item was shipped ──
  try {
    const serviceSupabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)
    const { data: orderData } = await supabase
      .from('orders')
      .select('buyer_id, product:products(title)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderData?.buyer_id) {
      const product = Array.isArray(orderData.product) ? orderData.product[0] : orderData.product
      await notifyUser(serviceSupabase, orderData.buyer_id, 'WAYBILL_UPLOADED', {
        orderId,
        productTitle: product?.title,
      })
    }
  } catch (notifErr) {
    console.error('Failed to send shipping notification:', notifErr)
  }

  console.log(`✅ Order ${orderId} shipped via Rail 1 (carrier: ${carrier || 'unknown'}, tracking: ${trackingId})`)
  return c.json({ message: 'Order shipped via API Tracking (Rail 1)' }, 200)
})

// ══════════════════════════════════════════════
// MODULE 5: LOGISTICS — RAIL 2 (Manual Waybill)
// POST /api/logistics/rail2
// Vendor only — order must be in PAID status
// ══════════════════════════════════════════════

app.post('/api/logistics/rail2', async (c) => {
  const user = c.get('user')
  let body: { orderId?: string; waybillUrl?: string; courierPhone?: string; estimatedDeliveryDate?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { orderId, waybillUrl, courierPhone, estimatedDeliveryDate } = body

  if (!orderId || typeof orderId !== 'string') {
    return c.json({ error: 'orderId is required' }, 400)
  }
  if (!waybillUrl || typeof waybillUrl !== 'string') {
    return c.json({ error: 'waybillUrl is required (upload the waybill photo first)' }, 400)
  }
  // Validate waybillUrl is a proper URL
  try {
    const parsed = new URL(waybillUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return c.json({ error: 'waybillUrl must be an http or https URL' }, 400)
    }
  } catch {
    return c.json({ error: 'waybillUrl must be a valid URL' }, 400)
  }
  if (waybillUrl.length > 2048) {
    return c.json({ error: 'waybillUrl is too long (max 2048 characters)' }, 400)
  }
  if (!courierPhone || typeof courierPhone !== 'string') {
    return c.json({ error: 'courierPhone is required' }, 400)
  }
  if (courierPhone.length > 20) {
    return c.json({ error: 'courierPhone must be 20 characters or less' }, 400)
  }
  if (!estimatedDeliveryDate || typeof estimatedDeliveryDate !== 'string') {
    return c.json({ error: 'estimatedDeliveryDate is required' }, 400)
  }

  // Validate EDD is in the future
  const eddDate = new Date(estimatedDeliveryDate)
  if (isNaN(eddDate.getTime()) || eddDate.getTime() <= Date.now()) {
    return c.json({ error: 'estimatedDeliveryDate must be a valid future date' }, 400)
  }

  const supabase = c.get('supabase')

  // Verify vendor ownership and status
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, vendor_id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }
  if (order.vendor_id !== user.id) {
    return c.json({ error: 'Only the vendor can fulfill this order' }, 403)
  }
  if (order.status !== 'PAID') {
    return c.json({ error: `Cannot ship: order status is ${order.status}, expected PAID` }, 409)
  }

  // Update order to SHIPPED
  const { error } = await supabase
    .from('orders')
    .update({
      shipping_type: 'MANUAL_WAYBILL',
      waybill_url: waybillUrl,
      courier_phone: courierPhone,
      estimated_delivery_date: estimatedDeliveryDate,
      status: 'SHIPPED',
      shipped_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  // Start EDD+24h timer via Durable Object
  try {
    const doId = c.env.ORDER_DO.idFromName(orderId)
    const stub = c.env.ORDER_DO.get(doId)
    await stub.fetch('http://do/start-edd-timer', {
      method: 'POST',
      body: JSON.stringify({ orderId, eddIso: estimatedDeliveryDate }),
    })
  } catch (doErr) {
    console.error('Failed to start EDD timer:', doErr)
    // Don't fail the request — the timer is secondary
  }

  // ── MODULE 9: Notify buyer that item was shipped (Rail 2) ──
  try {
    const serviceSupabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)
    const { data: orderData } = await supabase
      .from('orders')
      .select('buyer_id, product:products(title)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderData?.buyer_id) {
      const product = Array.isArray(orderData.product) ? orderData.product[0] : orderData.product
      await notifyUser(serviceSupabase, orderData.buyer_id, 'WAYBILL_UPLOADED', {
        orderId,
        productTitle: product?.title,
      })
    }
  } catch (notifErr) {
    console.error('Failed to send shipping notification:', notifErr)
  }

  console.log(`✅ Order ${orderId} shipped via Rail 2 (waybill uploaded, EDD: ${estimatedDeliveryDate})`)
  return c.json({ message: 'Order shipped via Manual Waybill (Rail 2)' }, 200)
})

// ══════════════════════════════════════════════
// MODULE 5: CONFIRM DELIVERY
// POST /api/orders/:id/confirm-delivery
// Buyer only — order must be in SHIPPED status
// ══════════════════════════════════════════════

app.post('/api/orders/:id/confirm-delivery', async (c) => {
  const orderId = c.req.param('id')
  const user = c.get('user')
  const supabase = c.get('supabase')

  // Verify buyer ownership and status
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, buyer_id, is_disputed')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }
  if (order.buyer_id !== user.id) {
    return c.json({ error: 'Only the buyer can confirm delivery' }, 403)
  }
  if (order.status !== 'SHIPPED') {
    return c.json({ error: `Cannot confirm delivery: order status is ${order.status}, expected SHIPPED` }, 409)
  }

  // Update order to DELIVERED
  const now = new Date().toISOString()
  const autoReleaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'DELIVERED',
      delivered_at: now,
      auto_release_at: autoReleaseAt,
    })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  // Start 48h dispute window via Durable Object
  try {
    const doId = c.env.ORDER_DO.idFromName(orderId)
    const stub = c.env.ORDER_DO.get(doId)
    await stub.fetch('http://do/start-dispute-timer', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    })
  } catch (doErr) {
    console.error('Failed to start dispute timer:', doErr)
  }

  // ── MODULE 9: Notify vendor that delivery was confirmed ──
  try {
    const serviceSupabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)
    const { data: orderData } = await supabase
      .from('orders')
      .select('vendor_id, product:products(title)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderData?.vendor_id) {
      const product = Array.isArray(orderData.product) ? orderData.product[0] : orderData.product
      await notifyUser(serviceSupabase, orderData.vendor_id, 'DELIVERY_CONFIRMED', {
        orderId,
        productTitle: product?.title,
      })
    }
  } catch (notifErr) {
    console.error('Failed to send delivery confirmation notification:', notifErr)
  }

  console.log(`✅ Order ${orderId} — buyer confirmed delivery. 48h dispute window started.`)
  return c.json({
    message: 'Delivery confirmed. 48-hour dispute window started.',
    auto_release_at: autoReleaseAt,
  }, 200)
})

// ══════════════════════════════════════════════
// MODULE 6: FILE DISPUTE (Enhanced)
// POST /api/orders/:id/dispute
// Buyer only — order must be in DELIVERED status
// ══════════════════════════════════════════════

const VALID_DISPUTE_CATEGORIES = ['NOT_RECEIVED', 'WRONG_ITEM', 'DAMAGED', 'OTHER'] as const

app.post('/api/orders/:id/dispute', async (c) => {
  const orderId = c.req.param('id')
  if (!isValidUUID(orderId)) return c.json({ error: 'Invalid order ID format' }, 400)
  const user = c.get('user')

  let body: { reason?: string; category?: string; evidenceUrls?: string[] }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { reason, category, evidenceUrls } = body

  // Validate + sanitize reason
  const safeReason = sanitizeString(reason, 2000)
  if (!safeReason || safeReason.length < 5) {
    return c.json({ error: 'A dispute reason is required (minimum 5 characters)' }, 400)
  }

  // Validate category
  if (!category || !VALID_DISPUTE_CATEGORIES.includes(category as any)) {
    return c.json({ error: `Category is required. Must be one of: ${VALID_DISPUTE_CATEGORIES.join(', ')}` }, 400)
  }

  // Validate evidence URLs (optional but capped)
  const validEvidenceUrls: string[] = []
  if (evidenceUrls && Array.isArray(evidenceUrls)) {
    if (evidenceUrls.length > 5) {
      return c.json({ error: 'Maximum 5 evidence photos allowed' }, 400)
    }
    for (const url of evidenceUrls) {
      if (typeof url !== 'string' || url.length > 2048) {
        return c.json({ error: 'Each evidence URL must be a valid string under 2048 characters' }, 400)
      }
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return c.json({ error: 'Evidence URLs must use http or https protocol' }, 400)
        }
        validEvidenceUrls.push(url)
      } catch {
        return c.json({ error: `Invalid evidence URL: ${url.substring(0, 50)}...` }, 400)
      }
    }
  }

  const supabase = c.get('supabase')

  // Verify buyer ownership and status
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, buyer_id, is_disputed, auto_release_at')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }
  if (order.buyer_id !== user.id) {
    return c.json({ error: 'Only the buyer can file a dispute' }, 403)
  }
  if (order.is_disputed) {
    return c.json({ error: 'This order is already disputed' }, 409)
  }
  if (order.status !== 'DELIVERED') {
    return c.json({ error: `Cannot dispute: order status is ${order.status}, expected DELIVERED` }, 409)
  }

  // Check if the 48h window has expired
  if (order.auto_release_at && new Date(order.auto_release_at).getTime() < Date.now()) {
    return c.json({ error: 'The 48-hour dispute window has expired' }, 410)
  }

  // Update order to DISPUTED
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'DISPUTED',
      is_disputed: true,
      dispute_reason: safeReason,
      dispute_category: category,
      dispute_evidence_urls: validEvidenceUrls.length > 0 ? validEvidenceUrls : null,
      disputed_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  // Pause the Durable Object timer
  try {
    const doId = c.env.ORDER_DO.idFromName(orderId)
    const stub = c.env.ORDER_DO.get(doId)
    await stub.fetch('http://do/pause-timer')
  } catch (doErr) {
    console.error('Failed to pause dispute timer:', doErr)
  }

  // ── MODULE 9: Notify vendor of dispute ──
  try {
    const serviceSupabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY)
    const { data: orderData } = await supabase
      .from('orders')
      .select('vendor_id, product:products(title)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderData?.vendor_id) {
      const product = Array.isArray(orderData.product) ? orderData.product[0] : orderData.product
      await notifyUser(serviceSupabase, orderData.vendor_id, 'DISPUTE_OPENED', {
        orderId,
        productTitle: product?.title,
      })
    }
  } catch (notifErr) {
    console.error('Failed to send dispute notification:', notifErr)
  }

  console.log(`⚠️ Order ${orderId} — dispute filed. Category: ${category}, Reason: ${reason}`)
  return c.json({ message: 'Dispute filed. Auto-release has been paused.' }, 200)
})

// ══════════════════════════════════════════════
// MODULE 5: TIMER STATUS (proxy to Durable Object)
// GET /api/orders/:id/timer
// ══════════════════════════════════════════════

app.get('/api/orders/:id/timer', async (c) => {
  const orderId = c.req.param('id')
  const user = c.get('user')
  const supabase = c.get('supabase')

  // Verify caller is buyer or vendor of this order
  const { data: order } = await supabase
    .from('orders')
    .select('buyer_id, vendor_id')
    .eq('id', orderId)
    .single()

  if (!order || (order.buyer_id !== user.id && order.vendor_id !== user.id)) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const doId = c.env.ORDER_DO.idFromName(orderId)
    const stub = c.env.ORDER_DO.get(doId)
    const res = await stub.fetch('http://do/status')
    const data = await res.json()
    return c.json(data)
  } catch {
    return c.json({ active: false })
  }
})

// ══════════════════════════════════════════════
// MODULE 6: ADMIN — LIST DISPUTED ORDERS
// GET /api/admin/disputes
// Admin/Super Admin only
// ══════════════════════════════════════════════

app.get('/api/admin/disputes', async (c) => {
  const serviceSupabase = c.get('serviceSupabase')

  // Fetch all disputed orders with full context
  const { data: disputes, error } = await serviceSupabase
    .from('orders')
    .select(`
      id, status, is_disputed, dispute_reason, dispute_category,
      dispute_evidence_urls, admin_notes, disputed_at, resolved_at, resolved_by,
      total_amount, currency, quantity,
      shipping_type, waybill_url, courier_phone, tracking_id,
      estimated_delivery_date, shipped_at, delivered_at, auto_release_at,
      created_at,
      product:products(id, title, images, base_price, currency),
      escrow:escrow_ledger(id, gross_amount, fee_amount, net_payout, status, margin_check_passed),
      buyer:profiles!orders_buyer_id_fkey(id, full_name, email),
      vendor:profiles!orders_vendor_id_fkey(id, full_name, email, kyc_level)
    `)
    .eq('is_disputed', true)
    .order('disputed_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch disputes:', error.message)
    return c.json({ error: 'Failed to fetch disputes' }, 500)
  }

  return c.json({ disputes: disputes || [] })
})

// ══════════════════════════════════════════════
// MODULE 6: ADMIN — RESOLVE DISPUTE
// POST /api/admin/disputes/:id/resolve
// Super Admin only — Force Complete or Force Refund
// ══════════════════════════════════════════════

app.post('/api/admin/disputes/:id/resolve', async (c) => {
  const orderId = c.req.param('id')
  if (!isValidUUID(orderId)) return c.json({ error: 'Invalid order ID format' }, 400)
  const user = c.get('user')

  let body: { outcome?: string; notes?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { outcome, notes } = body

  if (!outcome || !['COMPLETED', 'REFUNDED'].includes(outcome)) {
    return c.json({ error: 'outcome must be COMPLETED or REFUNDED' }, 400)
  }
  if (notes && (typeof notes !== 'string' || notes.length > 5000)) {
    return c.json({ error: 'Notes must be a string under 5000 characters' }, 400)
  }
  const safeNotes = notes ? sanitizeString(notes, 5000) : null

  const serviceSupabase = c.get('serviceSupabase')

  // Fetch the order
  const { data: order, error: fetchError } = await serviceSupabase
    .from('orders')
    .select('id, status, is_disputed')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return c.json({ error: 'Order not found' }, 404)
  }
  if (!order.is_disputed || order.status !== 'DISPUTED') {
    return c.json({ error: `Cannot resolve: order status is ${order.status}, expected DISPUTED` }, 409)
  }

  const now = new Date().toISOString()

  // Build update payload — preserve existing admin_notes if no new notes
  const updatePayload: Record<string, unknown> = {
    status: outcome,
    is_disputed: false,
    resolved_at: now,
    resolved_by: user.id,
    auto_release_at: now,
  }
  if (safeNotes && safeNotes.length > 0) {
    updatePayload.admin_notes = safeNotes
  }

  // 1. Update order status
  const { error: orderError } = await serviceSupabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)

  if (orderError) {
    console.error('Failed to update order:', orderError.message)
    return c.json({ error: 'Failed to resolve dispute' }, 500)
  }

  // 2. Update escrow ledger
  const newVaultStatus = outcome === 'COMPLETED' ? 'RELEASED' : 'FROZEN'
  const ledgerUpdate: Record<string, unknown> = { status: newVaultStatus }

  // Module 8: If REFUNDED, initiate real Paystack refund
  if (outcome === 'REFUNDED') {
    // Fetch the order's paystack_ref for the refund
    const { data: fullOrder } = await serviceSupabase
      .from('orders')
      .select('paystack_ref, total_amount')
      .eq('id', orderId)
      .single()

    if (fullOrder?.paystack_ref) {
      try {
        const refundResult = await createRefund({
          transaction: fullOrder.paystack_ref,
          merchantNote: `Dispute resolution: ${safeNotes || 'Admin refund'}`,
          customerNote: 'Your payment has been refunded due to dispute resolution.',
          secretKey: c.env.PAYSTACK_SECRET_KEY,
        })

        ledgerUpdate.paystack_refund_id = String(refundResult.id)
        ledgerUpdate.paystack_refund_status = refundResult.status
        ledgerUpdate.refunded_at = new Date().toISOString()
        ledgerUpdate.status = 'REFUNDED'

        console.log(`💸 Paystack refund initiated for order ${orderId}: refund ID ${refundResult.id}`)
      } catch (refundErr) {
        const refundMsg = refundErr instanceof Error ? refundErr.message : 'Unknown refund error'
        console.error(`❌ Paystack refund failed for order ${orderId}:`, refundMsg)
        // Don't fail the resolution — mark as FROZEN and admin can retry
        ledgerUpdate.status = 'FROZEN'
      }
    }
  }

  const { error: ledgerError } = await serviceSupabase
    .from('escrow_ledger')
    .update(ledgerUpdate)
    .eq('order_id', orderId)

  if (ledgerError) {
    console.error('Failed to update escrow ledger:', ledgerError.message)
    // Don't fail the request — the order status was already updated
  }

  // 3. Cancel the Durable Object timer
  try {
    const doId = c.env.ORDER_DO.idFromName(orderId)
    const stub = c.env.ORDER_DO.get(doId)
    await stub.fetch('http://do/cancel-timer')
  } catch (doErr) {
    console.error('Failed to cancel timer:', doErr)
  }

  const action = outcome === 'COMPLETED' ? 'Force Complete (funds released to vendor)' : 'Force Refund (funds frozen for buyer refund)'
  console.log(`🔒 ADMIN ACTION: Order ${orderId} — ${action}. Resolved by admin ${user.id}`)

  // Audit log for dispute resolution
  await logAuditAction(serviceSupabase, {
    adminId: user.id,
    action: 'DISPUTE_RESOLVED',
    targetType: 'order',
    targetId: orderId,
    metadata: { outcome, vault_status: newVaultStatus, admin_notes: safeNotes || null },
  })

  // ── MODULE 9: Notify buyer + vendor of dispute resolution ──
  try {
    const { data: fullOrderNotif } = await serviceSupabase
      .from('orders')
      .select('buyer_id, vendor_id, product:products(title)')
      .eq('id', orderId)
      .maybeSingle()

    if (fullOrderNotif) {
      const product = Array.isArray(fullOrderNotif.product) ? fullOrderNotif.product[0] : fullOrderNotif.product
      const ctx = { orderId, productTitle: product?.title }
      const notifications = [
        {
          userId: fullOrderNotif.buyer_id,
          type: 'DISPUTE_RESOLVED' as const,
          ...getNotificationContent('DISPUTE_RESOLVED', ctx),
          metadata: { order_id: orderId, product_title: ctx.productTitle, outcome },
        },
        {
          userId: fullOrderNotif.vendor_id,
          type: 'DISPUTE_RESOLVED' as const,
          ...getNotificationContent('DISPUTE_RESOLVED', ctx),
          metadata: { order_id: orderId, product_title: ctx.productTitle, outcome },
        },
      ]
      await createBulkNotifications(serviceSupabase, notifications)
    }
  } catch (notifErr) {
    console.error('Failed to send dispute resolution notifications:', notifErr)
  }

  return c.json({
    message: `Dispute resolved: ${action}`,
    outcome,
    vault_status: newVaultStatus,
    resolved_at: now,
  }, 200)
})

// ══════════════════════════════════════════════
// MODULE 6: ADMIN — ADD/UPDATE NOTES
// POST /api/admin/disputes/:id/notes
// Admin/Super Admin only
// ══════════════════════════════════════════════

app.post('/api/admin/disputes/:id/notes', async (c) => {
  const orderId = c.req.param('id')
  if (!isValidUUID(orderId)) return c.json({ error: 'Invalid order ID format' }, 400)
  const user = c.get('user')

  let body: { notes?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { notes } = body
  const safeNotes = sanitizeString(notes, 5000)
  if (!safeNotes || safeNotes.length === 0) {
    return c.json({ error: 'Notes content is required' }, 400)
  }

  const serviceSupabase = c.get('serviceSupabase')

  // Verify order exists and is disputed
  const { data: order } = await serviceSupabase
    .from('orders')
    .select('id, is_disputed')
    .eq('id', orderId)
    .single()

  if (!order) {
    return c.json({ error: 'Order not found' }, 404)
  }

  const { error } = await serviceSupabase
    .from('orders')
    .update({ admin_notes: safeNotes })
    .eq('id', orderId)

  if (error) {
    return c.json({ error: 'Failed to save notes' }, 500)
  }

  return c.json({ message: 'Notes saved successfully' }, 200)
})

// ══════════════════════════════════════════════
// MODULE 7: SUPER ADMIN GOD MODE
// Helper: Check cached role (no DB query needed — admin middleware already fetched it)
// ══════════════════════════════════════════════

function requireSuperAdmin(role: string): { authorized: boolean } {
  return { authorized: role === 'SUPER_ADMIN' }
}

async function logAuditAction(
  supabase: SupabaseClient,
  params: {
    adminId: string
    action: string
    targetType: string
    targetId?: string
    metadata?: Record<string, unknown>
  }
) {
  try {
    await supabase.from('audit_log').insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
    })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}

// ══════════════════════════════════════════════
// MODULE 7.1: ENHANCED PAYOUT QUEUE
// GET /api/admin/payout/queue
// ══════════════════════════════════════════════

app.get('/api/admin/payout/queue', async (c) => {
  const serviceSupabase = c.get('serviceSupabase')

  const { data: queue, error } = await serviceSupabase
    .from('payout_queue_friday')
    .select('*')

  if (error) {
    console.error('Failed to fetch payout queue:', error.message)
    return c.json({ error: 'Failed to fetch payout queue' }, 500)
  }

  // Enrich with live margin check
  const enrichedQueue = (queue || []).map((item: Record<string, unknown>) => {
    const marginResult = checkMarginDrift(
      1.0, // checkout rate (stored at order time)
      getCurrentFxRate('USD', (item.settlement_currency as string) || 'NGN') || 1.0
    )
    return {
      ...item,
      margin_status: marginResult.passed ? 'SAFE' : 'DRIFT_WARNING',
      margin_drift: marginResult.drift,
    }
  })

  return c.json({
    queue: enrichedQueue,
    total_count: enrichedQueue.length,
    total_payout: enrichedQueue.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.net_payout || 0), 0),
  })
})

// ══════════════════════════════════════════════
// MODULE 7.1: BATCH PAYOUT EXECUTION
// POST /api/admin/payout/execute-batch
// ══════════════════════════════════════════════

app.post('/api/admin/payout/execute-batch', async (c) => {
  const user = c.get('user')
  const serviceSupabase = c.get('serviceSupabase')

  let body: { orderIds?: string[]; masterPassword?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { orderIds, masterPassword } = body

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return c.json({ error: 'orderIds must be a non-empty array' }, 400)
  }
  if (orderIds.length > 50) {
    return c.json({ error: 'Maximum 50 orders per batch' }, 400)
  }

  // Master password verification — MUST be set in environment, no fallback
  const expectedPassword = c.env.ADMIN_MASTER_PASSWORD
  if (!expectedPassword) {
    console.error('CRITICAL: ADMIN_MASTER_PASSWORD env var not set')
    return c.json({ error: 'Server misconfiguration — contact system administrator' }, 500)
  }
  if (!masterPassword) {
    return c.json({ error: 'Master password is required' }, 401)
  }
  // Timing-safe comparison to prevent timing attacks
  const encoder = new TextEncoder()
  const a = encoder.encode(masterPassword)
  const b = encoder.encode(expectedPassword)
  if (a.byteLength !== b.byteLength) {
    return c.json({ error: 'Invalid master password' }, 401)
  }
  let mismatch = 0
  for (let i = 0; i < a.byteLength; i++) {
    mismatch |= a[i] ^ b[i]
  }
  if (mismatch !== 0) {
    return c.json({ error: 'Invalid master password' }, 401)
  }

  // Validate all order IDs are UUIDs
  for (const id of orderIds) {
    if (!isValidUUID(id)) {
      return c.json({ error: `Invalid order ID format: ${id}` }, 400)
    }
  }

  // Fetch all orders + escrow in the batch
  const { data: orders, error: fetchError } = await serviceSupabase
    .from('orders')
    .select(`
      id, status, vendor_id, is_disputed, auto_release_at,
      total_amount, currency,
      escrow:escrow_ledger(id, net_payout, status, margin_check_passed)
    `)
    .in('id', orderIds)

  if (fetchError) {
    return c.json({ error: 'Failed to fetch orders' }, 500)
  }

  const results: Array<{ orderId: string; status: string; error?: string }> = []
  let totalReleased = 0

  for (const order of (orders || [])) {
    const escrow = Array.isArray(order.escrow) ? order.escrow[0] : order.escrow

    // Validation checks
    if (order.status !== 'DELIVERED') {
      results.push({ orderId: order.id, status: 'SKIPPED', error: `Status is ${order.status}, expected DELIVERED` })
      continue
    }
    if (order.is_disputed) {
      results.push({ orderId: order.id, status: 'SKIPPED', error: 'Order is disputed' })
      continue
    }
    if (!escrow || escrow.status !== 'LOCKED') {
      results.push({ orderId: order.id, status: 'SKIPPED', error: 'Escrow not in LOCKED state' })
      continue
    }

    // Module 8: Determine payout method and execute real transfer
    // Fetch vendor profile for recipient info
    const { data: vendorProfile } = await serviceSupabase
      .from('profiles')
      .select('settlement_currency, wise_recipient_id, bank_account_number, bank_code, bank_account_name')
      .eq('id', order.vendor_id)
      .single()

    const payoutRail = escrow.payout_rail_type || (vendorProfile?.settlement_currency === 'NGN' ? 'PAYSTACK_NGN' : 'WISE_GLOBAL')
    const escrowUpdate: Record<string, unknown> = { status: 'RELEASED', payout_executed_at: new Date().toISOString(), payout_executed_by: user.id }

    // Update order to COMPLETED
    const { error: orderErr } = await serviceSupabase
      .from('orders')
      .update({ status: 'COMPLETED' })
      .eq('id', order.id)

    if (orderErr) {
      results.push({ orderId: order.id, status: 'FAILED', error: orderErr.message })
      continue
    }

    // Execute real payout based on rail type
    if (payoutRail === 'PAYSTACK_NGN' && vendorProfile?.bank_account_number && vendorProfile?.bank_code) {
      // NGN payout via Paystack Transfer
      try {
        // Create recipient if needed
        const recipient = await createTransferRecipient({
          type: 'nuban',
          name: vendorProfile.bank_account_name || 'Vendor',
          accountNumber: vendorProfile.bank_account_number,
          bankCode: vendorProfile.bank_code,
          secretKey: c.env.PAYSTACK_SECRET_KEY,
        })

        // Initiate transfer (amount in kobo)
        const transfer = await initiateTransfer({
          amount: Math.round(Number(escrow.net_payout) * 100),
          recipientCode: recipient.recipient_code,
          reason: `Afia payout: Order ${order.id.slice(0, 8)}`,
          reference: `AFIA-PAYOUT-${order.id.slice(0, 8)}-${Date.now().toString(36)}`,
          secretKey: c.env.PAYSTACK_SECRET_KEY,
        })

        escrowUpdate.paystack_transfer_id = String(transfer.id)
        escrowUpdate.paystack_transfer_code = transfer.transfer_code
        escrowUpdate.paystack_recipient_code = recipient.recipient_code
        console.log(`💰 Paystack payout for order ${order.id}: transfer ${transfer.transfer_code}`)
      } catch (payErr) {
        const payMsg = payErr instanceof Error ? payErr.message : 'Unknown payout error'
        console.error(`❌ Paystack payout failed for order ${order.id}:`, payMsg)
        escrowUpdate.status = 'LOCKED' // Revert — admin can retry
        results.push({ orderId: order.id, status: 'FAILED', error: `Paystack payout: ${payMsg}` })
        continue
      }
    } else if (payoutRail === 'WISE_GLOBAL' && c.env.WISE_API_TOKEN && c.env.WISE_PROFILE_ID && vendorProfile?.wise_recipient_id) {
      // Global payout via Wise
      try {
        const profileId = Number(c.env.WISE_PROFILE_ID)
        const quote = await createQuote({
          profileId,
          sourceCurrency: 'USD',
          targetCurrency: vendorProfile.settlement_currency || 'USD',
          targetAmount: Number(escrow.net_payout),
        }, c.env.WISE_API_TOKEN)

        const transfer = await createWiseTransfer({
          targetAccount: Number(vendorProfile.wise_recipient_id),
          quoteUuid: quote.id,
          customerTransactionId: `AFIA-PAYOUT-${order.id}`,
          reference: `Afia Order ${order.id.slice(0, 8)}`,
        }, c.env.WISE_API_TOKEN)

        await fundTransfer(profileId, transfer.id, c.env.WISE_API_TOKEN)

        escrowUpdate.wise_quote_id = quote.id
        escrowUpdate.wise_transfer_id = String(transfer.id)
        escrowUpdate.wise_transfer_status = transfer.status
        console.log(`🌍 Wise payout for order ${order.id}: transfer ${transfer.id}`)
      } catch (wiseErr) {
        const wiseMsg = wiseErr instanceof Error ? wiseErr.message : 'Unknown Wise error'
        console.error(`❌ Wise payout failed for order ${order.id}:`, wiseMsg)
        escrowUpdate.status = 'LOCKED' // Revert — admin can retry
        results.push({ orderId: order.id, status: 'FAILED', error: `Wise payout: ${wiseMsg}` })
        continue
      }
    } else {
      // No payout method configured — mark as released (manual payout)
      console.warn(`⚠️ No payout method for order ${order.id} (rail: ${payoutRail}). Marked as RELEASED for manual processing.`)
    }

    // Update escrow
    const { error: escrowErr } = await serviceSupabase
      .from('escrow_ledger')
      .update(escrowUpdate)
      .eq('id', escrow.id)

    if (escrowErr) {
      results.push({ orderId: order.id, status: 'PARTIAL', error: 'Order updated but escrow release failed' })
      continue
    }

    totalReleased += Number(escrow.net_payout || 0)
    results.push({ orderId: order.id, status: 'RELEASED' })
  }

  // Log the batch payout action
  await logAuditAction(serviceSupabase, {
    adminId: user.id,
    action: 'BATCH_PAYOUT_EXECUTED',
    targetType: 'payout',
    metadata: {
      order_count: orderIds.length,
      released_count: results.filter(r => r.status === 'RELEASED').length,
      total_released: totalReleased,
      results,
    },
  })

  console.log(`💰 BATCH PAYOUT: ${results.filter(r => r.status === 'RELEASED').length}/${orderIds.length} orders released by admin ${user.id}`)
  return c.json({
    message: 'Batch payout executed',
    total_released: totalReleased,
    results,
  })
})

// ══════════════════════════════════════════════
// MODULE 7.2: VENDOR MANAGEMENT — LIST VENDORS
// GET /api/admin/vendors
// ══════════════════════════════════════════════

app.get('/api/admin/vendors', async (c) => {
  const serviceSupabase = c.get('serviceSupabase')

  // Fetch all vendors
  const { data: vendors, error } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, email, role, kyc_level, is_flagged, flag_reason, flagged_at, treasury_mode, settlement_currency, created_at')
    .eq('role', 'VENDOR')
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ error: 'Failed to fetch vendors' }, 500)
  }

  // Batch-fetch all vendor order stats in a single query (avoids N+1)
  const vendorIds = (vendors || []).map((v: Record<string, unknown>) => v.id as string)
  const { data: allOrders } = vendorIds.length > 0
    ? await serviceSupabase
      .from('orders')
      .select('id, vendor_id, status, is_disputed, total_amount')
      .in('vendor_id', vendorIds)
    : { data: [] }

  // Group orders by vendor_id
  const ordersByVendor = new Map<string, Array<Record<string, unknown>>>()
  for (const order of (allOrders || [])) {
    const vid = order.vendor_id as string
    if (!ordersByVendor.has(vid)) ordersByVendor.set(vid, [])
    ordersByVendor.get(vid)!.push(order)
  }

  // Enrich vendors with computed stats
  const enrichedVendors = (vendors || []).map((vendor: Record<string, unknown>) => {
    const orders = ordersByVendor.get(vendor.id as string) || []
    const totalOrders = orders.length
    const disputedOrders = orders.filter((o: Record<string, unknown>) => o.is_disputed).length
    const totalEscrowed = orders.reduce((sum: number, o: Record<string, unknown>) => sum + Number(o.total_amount || 0), 0)

    // KYC velocity check: >$500 in first 48h
    const createdAt = new Date(vendor.created_at as string)
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    const kycVelocityAlert = hoursSinceCreation <= 48 && totalEscrowed > 500

    return {
      ...vendor,
      total_orders: totalOrders,
      disputed_orders: disputedOrders,
      dispute_rate: totalOrders > 0 ? Math.round((disputedOrders / totalOrders) * 100) : 0,
      total_escrowed: totalEscrowed,
      kyc_velocity_alert: kycVelocityAlert,
    }
  })

  return c.json({ vendors: enrichedVendors })
})

// ══════════════════════════════════════════════
// MODULE 7.2: VENDOR MANAGEMENT — FLAG/UNFLAG
// POST /api/admin/vendors/:id/flag
// ══════════════════════════════════════════════

app.post('/api/admin/vendors/:id/flag', async (c) => {
  const vendorId = c.req.param('id')
  if (!isValidUUID(vendorId)) return c.json({ error: 'Invalid vendor ID' }, 400)
  const user = c.get('user')
  const serviceSupabase = c.get('serviceSupabase')

  let body: { action?: string; reason?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { action, reason } = body
  if (!action || !['FLAG', 'UNFLAG'].includes(action)) {
    return c.json({ error: 'action must be FLAG or UNFLAG' }, 400)
  }

  // Verify vendor exists
  const { data: vendor } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, role, is_flagged')
    .eq('id', vendorId)
    .single()

  if (!vendor || vendor.role !== 'VENDOR') {
    return c.json({ error: 'Vendor not found' }, 404)
  }

  const now = new Date().toISOString()
  const flagUpdate = action === 'FLAG'
    ? { is_flagged: true, flag_reason: reason || 'Flagged by admin', flagged_at: now, flagged_by: user.id }
    : { is_flagged: false, flag_reason: null, flagged_at: null, flagged_by: null }

  const { error: updateError } = await serviceSupabase
    .from('profiles')
    .update(flagUpdate)
    .eq('id', vendorId)

  if (updateError) {
    return c.json({ error: 'Failed to update vendor flag' }, 500)
  }

  // If flagging: freeze all LOCKED escrow for this vendor
  if (action === 'FLAG') {
    const { data: vendorOrders } = await serviceSupabase
      .from('orders')
      .select('id')
      .eq('vendor_id', vendorId)

    if (vendorOrders && vendorOrders.length > 0) {
      const orderIds = vendorOrders.map((o: Record<string, unknown>) => o.id as string)
      await serviceSupabase
        .from('escrow_ledger')
        .update({ status: 'FROZEN' })
        .in('order_id', orderIds)
        .eq('status', 'LOCKED')
    }
  }

  // Audit log
  await logAuditAction(serviceSupabase, {
    adminId: user.id,
    action: action === 'FLAG' ? 'VENDOR_FLAGGED' : 'VENDOR_UNFLAGGED',
    targetType: 'vendor',
    targetId: vendorId,
    metadata: { vendor_name: vendor.full_name, reason: reason || null },
  })

  console.log(`🚩 ADMIN: Vendor ${vendorId} ${action === 'FLAG' ? 'FLAGGED' : 'UNFLAGGED'} by admin ${user.id}`)
  return c.json({ message: `Vendor ${action === 'FLAG' ? 'flagged' : 'unflagged'} successfully` })
})

// ══════════════════════════════════════════════
// MODULE 7.2: VENDOR MANAGEMENT — TREASURY TOGGLE
// POST /api/admin/vendors/:id/treasury-toggle
// ══════════════════════════════════════════════

app.post('/api/admin/vendors/:id/treasury-toggle', async (c) => {
  const vendorId = c.req.param('id')
  if (!isValidUUID(vendorId)) return c.json({ error: 'Invalid vendor ID' }, 400)
  const user = c.get('user')
  const serviceSupabase = c.get('serviceSupabase')

  let body: { mode?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { mode } = body
  if (!mode || !['AUTO', 'MANUAL_HOLD'].includes(mode)) {
    return c.json({ error: 'mode must be AUTO or MANUAL_HOLD' }, 400)
  }

  const { data: vendor } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, role, treasury_mode')
    .eq('id', vendorId)
    .single()

  if (!vendor || vendor.role !== 'VENDOR') {
    return c.json({ error: 'Vendor not found' }, 404)
  }

  const { error } = await serviceSupabase
    .from('profiles')
    .update({ treasury_mode: mode })
    .eq('id', vendorId)

  if (error) {
    return c.json({ error: 'Failed to update treasury mode' }, 500)
  }

  await logAuditAction(serviceSupabase, {
    adminId: user.id,
    action: 'TREASURY_MODE_CHANGED',
    targetType: 'vendor',
    targetId: vendorId,
    metadata: { vendor_name: vendor.full_name, old_mode: vendor.treasury_mode, new_mode: mode },
  })

  return c.json({ message: `Treasury mode set to ${mode}` })
})

// ══════════════════════════════════════════════
// MODULE 7.3: ANALYTICS OVERVIEW
// GET /api/admin/analytics
// ══════════════════════════════════════════════

app.get('/api/admin/analytics', async (c) => {
  const serviceSupabase = c.get('serviceSupabase')

  // Total escrowed (LOCKED)
  const { data: lockedEscrow } = await serviceSupabase
    .from('escrow_ledger')
    .select('gross_amount')
    .eq('status', 'LOCKED')

  const totalEscrowed = (lockedEscrow || []).reduce(
    (sum: number, e: Record<string, unknown>) => sum + Number(e.gross_amount || 0), 0
  )

  // Released this week — filter by updated_at to get actual weekly releases
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: releasedEscrow } = await serviceSupabase
    .from('escrow_ledger')
    .select('net_payout')
    .eq('status', 'RELEASED')
    .gte('updated_at', weekAgo)

  const totalReleasedWeek = (releasedEscrow || []).reduce(
    (sum: number, e: Record<string, unknown>) => sum + Number(e.net_payout || 0), 0
  )

  // Active orders (non-terminal: not COMPLETED, not REFUNDED)
  const { count: activeOrders } = await serviceSupabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '(COMPLETED,REFUNDED)')

  // Dispute rate
  const { count: totalOrders } = await serviceSupabase
    .from('orders')
    .select('id', { count: 'exact', head: true })

  const { count: disputedOrders } = await serviceSupabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('is_disputed', true)

  const disputeRate = totalOrders && totalOrders > 0
    ? Math.round(((disputedOrders || 0) / totalOrders) * 100 * 10) / 10
    : 0

  // Total vendors
  const { count: totalVendors } = await serviceSupabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'VENDOR')

  // Pending payouts count
  const { data: pendingPayouts } = await serviceSupabase
    .from('payout_queue_friday')
    .select('order_id')

  return c.json({
    total_escrowed: totalEscrowed,
    total_released_week: totalReleasedWeek,
    active_orders: activeOrders || 0,
    dispute_rate: disputeRate,
    total_orders: totalOrders || 0,
    disputed_orders: disputedOrders || 0,
    total_vendors: totalVendors || 0,
    pending_payouts: (pendingPayouts || []).length,
  })
})

// ══════════════════════════════════════════════
// MODULE 7.4: AUDIT LOG
// GET /api/admin/audit-log
// ══════════════════════════════════════════════

app.get('/api/admin/audit-log', async (c) => {
  const serviceSupabase = c.get('serviceSupabase')

  const rawPage = parseInt(c.req.query('page') || '1')
  const rawLimit = parseInt(c.req.query('limit') || '50')
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50
  const offset = (page - 1) * limit

  const { data: logs, error, count } = await serviceSupabase
    .from('audit_log')
    .select(`
      id, action, target_type, target_id, metadata, ip_address, created_at,
      admin:profiles!audit_log_admin_id_fkey(id, full_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch audit log:', error.message)
    return c.json({ error: 'Failed to fetch audit log' }, 500)
  }

  return c.json({
    logs: logs || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  })
})

// ══════════════════════════════════════════════
// MODULE 9: NOTIFICATIONS API
// GET  /api/notifications          — paginated feed
// GET  /api/notifications/unread-count — badge count
// POST /api/notifications/mark-read — mark single or all
// ══════════════════════════════════════════════

app.get('/api/notifications', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  const rawPage = parseInt(c.req.query('page') || '1')
  const rawLimit = parseInt(c.req.query('limit') || '20')
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20
  const offset = (page - 1) * limit

  const { data: notifications, error, count } = await supabase
    .from('notifications')
    .select('id, type, title, body, metadata, is_read, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch notifications:', error.message)
    return c.json({ error: 'Failed to fetch notifications' }, 500)
  }

  return c.json({
    notifications: notifications || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  })
})

app.get('/api/notifications/unread-count', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to fetch unread count:', error.message)
    return c.json({ error: 'Failed to fetch unread count' }, 500)
  }

  return c.json({ count: count || 0 })
})

app.post('/api/notifications/mark-read', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  let body: { id?: string }
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const { id } = body

  // Validate notification ID if provided
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (id && !UUID_RE.test(id)) {
    return c.json({ error: 'Invalid notification ID format' }, 400)
  }

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // If a specific notification ID is provided, only mark that one
  if (id) {
    query = query.eq('id', id)
  }

  // Add select() to get affected row count
  const { error, data } = await query.select('id')

  if (error) {
    console.error('Failed to mark notifications as read:', error.message)
    return c.json({ error: 'Failed to update notifications' }, 500)
  }

  return c.json({ message: 'Notifications marked as read', updated: data?.length || 0 })
})

// ══════════════════════════════════════════════
// MODULE 10: DEVICE FINGERPRINT
// POST /api/profile/fingerprint
// Stores PostHog device fingerprint for Sybil detection
// ══════════════════════════════════════════════

app.post('/api/profile/fingerprint', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')

  const { data: body, error: parseError } = await parseJsonBody<{ fingerprint?: string; ip?: string }>(c.req)
  if (parseError || !body) {
    return c.json({ error: parseError || 'Invalid body' }, 400)
  }

  const fingerprint = sanitizeString(body.fingerprint, 200)
  if (!fingerprint || fingerprint.length < 5) {
    return c.json({ error: 'Valid fingerprint is required (min 5 chars)' }, 400)
  }

  // Store the device fingerprint and login IP
  const clientIp = getClientIp(c.req.raw)
  const { error } = await supabase
    .from('profiles')
    .update({
      device_fingerprint: fingerprint,
      last_login_ip: clientIp,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to store device fingerprint:', error.message)
    return c.json({ error: 'Failed to save fingerprint' }, 500)
  }

  return c.json({ message: 'Fingerprint stored' })
})

// ══════════════════════════════════════════════
// MODULE 10: SYBIL DETECTION (Admin)
// GET /api/admin/sybil-detection
// Returns accounts sharing device fingerprints
// ══════════════════════════════════════════════

app.get('/api/admin/sybil-detection', async (c) => {
  const serviceSupabase = c.get('serviceSupabase')

  const { data: matches, error } = await serviceSupabase
    .from('sybil_detection')
    .select('*')

  if (error) {
    console.error('Sybil detection query failed:', error.message)
    return c.json({ error: 'Failed to run sybil detection' }, 500)
  }

  // Flag buyer+vendor combos as HIGH risk
  const enriched = (matches || []).map((m: Record<string, unknown>) => {
    const roles = [m.user1_role, m.user2_role]
    const isBuyerVendor = roles.includes('BUYER') && roles.includes('VENDOR')
    return {
      ...m,
      risk_level: isBuyerVendor ? 'HIGH' : 'MEDIUM',
      reason: isBuyerVendor
        ? 'Buyer + Vendor on same device — potential self-dealing'
        : 'Multiple accounts on same device',
    }
  })

  return c.json({
    matches: enriched,
    high_risk_count: enriched.filter((m: Record<string, unknown>) => m.risk_level === 'HIGH').length,
    total_count: enriched.length,
  })
})

export default app
export { OrderDO } from './durable_objects/OrderDO'
