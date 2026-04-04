/**
 * Prerender Script for Neoa Landing Page
 * 
 * Runs AFTER `vite build` to inject static HTML into the landing page's
 * index.html. This gives search engines (Google, Bing) and AI answer
 * engines full HTML content without requiring JavaScript execution.
 * 
 * Only prerenders the `/` route since all other pages require auth/dynamic data.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')
const indexPath = path.join(distPath, 'index.html')

// SEO content to inject — this is the static HTML that crawlers will see
const seoContent = `
    <!-- Prerendered SEO content for crawlers -->
    <div id="seo-prerender" style="position:absolute;left:-9999px;overflow:hidden;width:1px;height:1px">
      <h1>Neoa — Discover, Buy, Sell &amp; Get Services Securely</h1>
      <p>Africa's premier escrow marketplace. Shop products, hire professionals, and connect with trusted vendors. Every transaction is securely protected.</p>
      
      <h2>Why Choose Neoa?</h2>
      <p>Neoa gives you a smooth, trusted experience from discovery to payment, so you shop with confidence on every order.</p>
      <h3>Smarter Product &amp; Service Discovery</h3>
      <p>Browse real-time posts from vendors, see updates instantly, and find exactly what you need without stress.</p>
      <h3>Instant Communication With Vendors</h3>
      <p>Chat directly with any vendor, negotiate prices, ask questions, and finalize details — all before you pay.</p>
      <h3>Safe &amp; Secure Payments</h3>
      <p>Every transaction is protected through our secure escrow system. Your money is safe until you confirm satisfaction.</p>
      <h3>Verified Vendors &amp; Trusted Marketplace</h3>
      <p>We verify every vendor's identity and use advanced systems to detect fraud — keeping the marketplace clean and safe for everyone.</p>

      <h2>How Neoa Works — For Customers</h2>
      <ol>
        <li><strong>Discover Products</strong> — Browse posts or products from trusted vendors on the Neoa feed.</li>
        <li><strong>Connect with Vendor</strong> — Chat directly with any vendor to agree on what you need.</li>
        <li><strong>Pay Securely</strong> — Make a secure payment through Neoa. Funds are safely held in escrow.</li>
        <li><strong>Receive &amp; Confirm</strong> — Get your order, confirm satisfaction, and the vendor gets paid.</li>
      </ol>

      <h2>How Neoa Works — For Vendors</h2>
      <ol>
        <li><strong>Create Your Store</strong> — Sign up, verify your identity, and set up your storefront in minutes.</li>
        <li><strong>List Products or Services</strong> — Upload your products with descriptions, images, and pricing.</li>
        <li><strong>Receive Orders</strong> — Get notified instantly when a customer places an order.</li>
        <li><strong>Get Paid Securely</strong> — Payment is released automatically once the customer confirms delivery.</li>
      </ol>

      <h2>Secure Escrow Payment Process</h2>
      <p>Your money is protected every step of the way. Payment is made, held in escrow, order is confirmed, then payment is released to the vendor.</p>

      <h2>Categories</h2>
      <ul>
        <li>Fashion &amp; Apparel</li><li>Electronics</li><li>Beauty &amp; Health</li>
        <li>Jewelry</li><li>Home &amp; Living</li><li>Art &amp; Crafts</li>
        <li>Food &amp; Beverage</li><li>Sports &amp; Fitness</li><li>Books &amp; Media</li>
        <li>Graphics Design</li><li>Video Editing</li><li>Web Design</li>
        <li>Copy Writing</li><li>Tailoring</li><li>Repair Services</li>
      </ul>

      <h2>Frequently Asked Questions</h2>
      <h3>Is my payment safe when I pay on Neoa?</h3>
      <p>Absolutely. When you pay on Neoa, your money is held securely in escrow — meaning the vendor doesn't receive it until you confirm you're satisfied with your order or service.</p>
      <h3>How does the escrow protection work?</h3>
      <p>You pay, Neoa holds the funds safely. The vendor fulfils your order, you confirm delivery and satisfaction, then Neoa releases the payment to the vendor.</p>
      <h3>Can I chat with a vendor before making payment?</h3>
      <p>Yes! You can message any vendor directly to ask questions, negotiate prices, clarify details, or request customisations — all before committing to a purchase.</p>
      <h3>What happens if there is an issue with my order?</h3>
      <p>You can open a dispute directly from your order page. The Neoa team will review the situation and work with both parties to reach a fair resolution.</p>
      <h3>Is it free to buy on Neoa?</h3>
      <p>Yes, completely free. Browsing, chatting, and placing orders on Neoa costs you nothing.</p>
      <h3>How do I start selling on Neoa?</h3>
      <p>Sign up, choose Vendor as your account type, complete your identity verification, and start listing products or services immediately. It's completely free to get started.</p>
      <h3>What does Neoa charge vendors?</h3>
      <p>Neoa charges a small commission on each successful transaction. There are no monthly subscription fees, no hidden charges. You only pay when you make a sale.</p>
      <h3>Can I buy from vendors in other countries?</h3>
      <p>Yes! Neoa supports cross-border transactions with multi-currency settlement. Escrow protection applies to every transaction regardless of location.</p>
      <h3>Can I sell services as well as products?</h3>
      <p>Absolutely. Neoa supports both product listings and service offerings — graphic designers, tailors, consultants and more.</p>
    </div>
`

// JSON-LD structured data
const jsonLd = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Neoa",
      "url": "https://neoahq.com",
      "description": "Africa's premier cross-border escrow marketplace. Shop products, hire professionals, and trade with confidence.",
      "foundingDate": "2026"
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {"@type": "Question", "name": "Is my payment safe when I pay on Neoa?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. When you pay on Neoa, your money is held securely in escrow — meaning the vendor doesn't receive it until you confirm you're satisfied with your order or service."}},
        {"@type": "Question", "name": "How does the escrow protection work?", "acceptedAnswer": {"@type": "Answer", "text": "You pay, Neoa holds the funds safely. The vendor fulfils your order, you confirm delivery and satisfaction, then Neoa releases the payment to the vendor."}},
        {"@type": "Question", "name": "Can I chat with a vendor before making payment?", "acceptedAnswer": {"@type": "Answer", "text": "Yes! You can message any vendor directly to ask questions, negotiate prices, clarify details, or request customisations — all before committing to a purchase."}},
        {"@type": "Question", "name": "How do I start selling on Neoa?", "acceptedAnswer": {"@type": "Answer", "text": "Sign up, choose Vendor as your account type, complete your identity verification, and start listing products or services immediately."}},
        {"@type": "Question", "name": "What does Neoa charge vendors?", "acceptedAnswer": {"@type": "Answer", "text": "Neoa charges a small commission on each successful transaction. No monthly fees, no hidden charges. You only pay when you make a sale."}},
        {"@type": "Question", "name": "What happens if there is an issue with my order?", "acceptedAnswer": {"@type": "Answer", "text": "You can open a dispute directly from your order page. The Neoa team will review the situation and work with both parties to reach a fair resolution. Your payment stays safely held in escrow."}}
      ]
    }
    </script>
`

async function prerender() {
  console.log('🔍 Prerendering landing page for SEO...')

  if (!fs.existsSync(indexPath)) {
    console.error('❌ dist/index.html not found. Run `npm run build` first.')
    process.exit(1)
  }

  let html = fs.readFileSync(indexPath, 'utf-8')

  // 1. Inject SEO content into the #root div (before it gets hydrated by React)
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${seoContent}</div>`
  )

  // 2. Inject JSON-LD into <head>
  html = html.replace('</head>', `${jsonLd}\n</head>`)

  // 3. Add canonical URL
  html = html.replace('</head>', '    <link rel="canonical" href="https://neoahq.com/" />\n</head>')

  // 4. Enhance robots meta
  html = html.replace('</head>', '    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />\n</head>')

  fs.writeFileSync(indexPath, html, 'utf-8')
  console.log('✅ Landing page prerendered successfully!')
  console.log('   → JSON-LD schemas injected (FAQPage + Organization)')
  console.log('   → Semantic HTML content injected for crawlers')
  console.log('   → Canonical URL + robots meta added')
}

prerender().catch(console.error)
