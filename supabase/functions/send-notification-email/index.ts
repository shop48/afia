/**
 * MODULE 9: Email Notification Edge Function (Stub)
 *
 * Supabase Edge Function that receives notification event data
 * and sends emails. Currently logs the email payload as a stub.
 *
 * Production: Wire up to Resend, Postmark, or SendGrid.
 *
 * Deploy: supabase functions deploy send-notification-email
 * Test:   supabase functions invoke send-notification-email --body '{"to":"...", "template":"ORDER_CONFIRMED", "data":{}}'
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// ══════════════════════════════════════════════
// SANITIZATION
// ══════════════════════════════════════════════

/** Escape HTML entities to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Basic email format validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320
}

// ══════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════

type TemplateKey =
  | 'ORDER_CONFIRMED'
  | 'WAYBILL_UPLOADED'
  | 'DELIVERY_CONFIRMED'
  | 'PRE_RELEASE_WARNING'
  | 'PAYOUT_RELEASED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'

interface TemplateData {
  productTitle?: string
  orderId?: string
  amount?: string
  vendorName?: string
  buyerName?: string
  autoReleaseDate?: string
  outcome?: string
}

/** Sanitize all string values in template data */
function sanitizeData(data: TemplateData): TemplateData {
  const clean: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(data)) {
    clean[key] = typeof value === 'string' ? escapeHtml(value.slice(0, 500)) : undefined
  }
  return clean as TemplateData
}

const TEMPLATES: Record<TemplateKey, {
  subject: (data: TemplateData) => string
  html: (data: TemplateData) => string
}> = {
  ORDER_CONFIRMED: {
    subject: () => 'Your Neoa Order is Confirmed',
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #1A2332; font-family: 'Playfair Display', serif; font-size: 24px;">Order Confirmed</h1>
        <p style="color: #444; line-height: 1.6;">
          Your order for <strong>${data.productTitle || 'your item'}</strong> has been confirmed
          and your payment is securely held in escrow.
        </p>
        ${data.amount ? `<p style="color: #444;">Amount: <strong>${data.amount}</strong></p>` : ''}
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          Track your order at <a href="https://neoa.com/dashboard" style="color: #C5A059;">your dashboard</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },

  WAYBILL_UPLOADED: {
    subject: (data) => `Your Order Has Shipped — ${data.productTitle || 'Neoa Order'}`,
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #1A2332; font-family: 'Playfair Display', serif; font-size: 24px;">Your Item is On Its Way</h1>
        <p style="color: #444; line-height: 1.6;">
          Great news! The vendor has shipped <strong>${data.productTitle || 'your item'}</strong>.
        </p>
        <p style="color: #444; line-height: 1.6;">
          Track the status in your <a href="https://neoa.com/dashboard" style="color: #C5A059;">dashboard</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },

  DELIVERY_CONFIRMED: {
    subject: () => 'Delivery Confirmed — 48-Hour Review Window Started',
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #1A2332; font-family: 'Playfair Display', serif; font-size: 24px;">Delivery Confirmed</h1>
        <p style="color: #444; line-height: 1.6;">
          The delivery of <strong>${data.productTitle || 'your item'}</strong> has been confirmed.
          You have <strong>48 hours</strong> to report any issues before the payment is released to the vendor.
        </p>
        <p style="color: #444; line-height: 1.6;">
          If everything looks good, no action is needed — the transaction will complete automatically.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },

  PRE_RELEASE_WARNING: {
    subject: () => 'Payment Will Be Released in 24 Hours',
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #1A2332; font-family: 'Playfair Display', serif; font-size: 24px;">24-Hour Release Warning</h1>
        <p style="color: #444; line-height: 1.6;">
          Payment for <strong>${data.productTitle || 'your order'}</strong> will be automatically
          released to the vendor in <strong>24 hours</strong>.
        </p>
        <p style="color: #DC2626; font-weight: 600;">
          If you have any issues with your order, please report them now.
        </p>
        <a href="https://neoa.com/dashboard" style="
          display: inline-block; padding: 12px 24px; background: #C5A059;
          color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px;
        ">Review in Dashboard</a>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },

  PAYOUT_RELEASED: {
    subject: (data) => `Payout Released — ${data.amount || 'Neoa Payout'}`,
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #059669; font-family: 'Playfair Display', serif; font-size: 24px;">Payout Released</h1>
        <p style="color: #444; line-height: 1.6;">
          Your payout for <strong>${data.productTitle || 'your order'}</strong> has been released.
        </p>
        ${data.amount ? `<p style="color: #444; font-size: 18px; font-weight: 700;">${data.amount}</p>` : ''}
        <p style="color: #666; font-size: 14px;">
          Funds should arrive in your bank account within 1-3 business days.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },

  DISPUTE_OPENED: {
    subject: () => 'A Dispute Has Been Filed on Your Order',
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #DC2626; font-family: 'Playfair Display', serif; font-size: 24px;">Dispute Filed</h1>
        <p style="color: #444; line-height: 1.6;">
          A dispute has been filed for <strong>${data.productTitle || 'an order'}</strong>.
          The automatic payment release has been paused while our team reviews the case.
        </p>
        <p style="color: #444; line-height: 1.6;">
          We'll notify you once a resolution is reached.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },

  DISPUTE_RESOLVED: {
    subject: () => 'Your Dispute Has Been Resolved',
    html: (data) => `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #1A2332; font-family: 'Playfair Display', serif; font-size: 24px;">Dispute Resolved</h1>
        <p style="color: #444; line-height: 1.6;">
          The dispute for <strong>${data.productTitle || 'your order'}</strong> has been resolved.
        </p>
        ${data.outcome ? `<p style="color: #444;">Outcome: <strong>${data.outcome}</strong></p>` : ''}
        <p style="color: #444; line-height: 1.6;">
          Check your <a href="https://neoa.com/dashboard" style="color: #C5A059;">dashboard</a> for details.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">Neoa &mdash; Secure Cross-Border Commerce</p>
      </div>
    `,
  },
}

// ══════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { to, template, data } = await req.json() as {
      to: string
      template: TemplateKey
      data: TemplateData
    }

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, template' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    if (!isValidEmail(to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const templateConfig = TEMPLATES[template]
    if (!templateConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize all template data to prevent XSS
    const safeData = sanitizeData(data || {} as TemplateData)

    const emailPayload = {
      to,
      subject: templateConfig.subject(safeData),
      html: templateConfig.html(safeData),
    }

    // ═══════════════════════════════════════════
    // STUB: Log the email payload
    // In production, replace this with Resend/Postmark/SendGrid API call:
    //
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'Neoa <noreply@neoa.com>',
    //     ...emailPayload,
    //   }),
    // })
    // ═══════════════════════════════════════════

    console.log('[Email Stub] Would send email:', JSON.stringify({
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length,
    }))

    return new Response(
      JSON.stringify({ message: 'Email notification queued (stub)' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email Stub] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
