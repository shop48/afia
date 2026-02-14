
import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_KEY: string
  ORDER_DO: DurableObjectNamespace
}

type Variables = {
  user: any
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Authentication Middleware (Simulated for now)
app.use('/api/*', async (c, next) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (error || !user) {
    return c.json({ error: 'Invalid Token' }, 401)
  }

  c.set('user', user)
  await next()
})

// Order Creation Route
app.post('/api/orders', async (c) => {
  const body = await c.req.json()
  // 1. Lock Stock via DO
  const id = c.env.ORDER_DO.idFromName(body.productId) // Use Product ID for Stock Lock scope? Or Order ID?
  // Actually for Stock Lock, we need a DO per Product or global Inventory DO. 
  // The blueprint says "Stock Lock" prevents overselling. A Product DO makes sense.

  const stub = c.env.ORDER_DO.get(id)
  const lockResponse = await stub.fetch('http://do/lock-stock')

  if (lockResponse.status !== 200) {
    return c.json({ error: 'Stock unavailable' }, 409)
  }

  // 2. Create Order in Supabase
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)
  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: c.get('user').id,
      product_id: body.productId,
      status: 'AWAITING_PAYMENT'
    })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)

  return c.json(data, 201)
})

// Logistics Routes
// Rail 1: API Automated (e.g., Terminal Africa / DHL)
app.post('/api/logistics/rail1', async (c) => {
  const { orderId, trackingId, carrier } = await c.req.json()
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)

  // 1. Verify tracking ID with Carrier API (Mocked)
  // const status = await fetchCarrierStatus(carrier, trackingId)
  // if (status !== 'VALID') return c.json({error: 'Invalid Tracking ID'}, 400)

  // 2. Update Order
  const { error } = await supabase
    .from('orders')
    .update({
      shipping_type: 'API_AUTOMATED',
      tracking_id: trackingId,
      status: 'SHIPPED',
      shipped_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  // 3. Start Polling via DO (Mocked: just start timer immediately for demo)
  // In real app, DO would wake up periodically to check API.

  return c.json({ message: 'Order shipped via Rail 1' }, 200)
})

// Rail 2: Manual Waybill
app.post('/api/logistics/rail2', async (c) => {
  const { orderId, waybillUrl, courierPhone, estimatedDeliveryDate } = await c.req.json()
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)

  // 1. Update Order
  const { error } = await supabase
    .from('orders')
    .update({
      shipping_type: 'MANUAL_WAYBILL',
      waybill_url: waybillUrl,
      courier_phone: courierPhone,
      estimated_delivery_date: estimatedDeliveryDate,
      status: 'SHIPPED',
      shipped_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  return c.json({ message: 'Order shipped via Rail 2 (Manual)' }, 200)
})

// Confirm Delivery (Starts 48h Timer)
app.post('/api/orders/:id/confirm-delivery', async (c) => {
  const orderId = c.req.param('id')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)

  // 1. Update DB to DELIVERED
  const { error } = await supabase
    .from('orders')
    .update({ status: 'DELIVERED', delivered_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return c.json({ error: error.message }, 500)

  // 2. Trigger DO Timer
  // For DO lookup, we assume we use product_id as key, or we need to look up the product_id first.
  // Ideally, we use order_id as DO key if we want order-specific timers. 
  // Let's assume we change strategy to use Order ID for the DO.

  const id = c.env.ORDER_DO.idFromName(orderId)
  const stub = c.env.ORDER_DO.get(id)
  await stub.fetch('http://do/start-timer')

  return c.json({ message: 'Delivery Confirmed. 48h Dispute Timer Started.' }, 200)
})

export default app
export { OrderDO } from './durable_objects/OrderDO'
