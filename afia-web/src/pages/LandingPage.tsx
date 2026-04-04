import { useEffect } from 'react'
import './LandingPage.css'

import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import LiveFeed from '../components/landing/LiveFeed'
import CategoryMarquee from '../components/landing/CategoryMarquee'
import EscrowTrust from '../components/landing/EscrowTrust'
import HowItWorks from '../components/landing/HowItWorks'
import WhyNeoa from '../components/landing/WhyNeoa'
import Testimonials from '../components/landing/Testimonials'

import FAQ from '../components/landing/FAQ'
import CTABanner from '../components/landing/CTABanner'
import Footer from '../components/landing/Footer'

/* ── SEO: FAQ Schema for AEO (Answer Engine Optimization) ── */
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is my payment safe when I pay on Neoa?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. When you pay on Neoa, your money is held securely in escrow — meaning the vendor doesn\'t receive it until you confirm you\'re satisfied with your order or service.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the escrow protection work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You pay, Neoa holds the funds safely. The vendor fulfils your order, you confirm delivery and satisfaction, then Neoa releases the payment to the vendor. This protects both sides of every transaction.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I chat with a vendor before making payment?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! You can message any vendor directly to ask questions, negotiate prices, clarify details, or request customisations — all before committing to a purchase.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I start selling on Neoa?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It takes just a few minutes. Sign up, choose Vendor as your account type, complete your identity verification, and start listing products or services immediately.',
      },
    },
    {
      '@type': 'Question',
      name: 'What fees does Neoa charge?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Browsing and buying on Neoa is completely free for customers. Vendors pay a small commission on each successful transaction — no monthly fees, no hidden charges. You only pay when you earn.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if there is an issue with my order?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can open a dispute directly from your order page. The Neoa team will review the situation and work with both parties to reach a fair resolution. Until it is resolved, your payment stays safely held in escrow.',
      },
    },
  ],
}

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Neoa',
  url: 'https://neoahq.com',
  description: 'Africa\'s premier cross-border escrow marketplace. Shop products, hire professionals, and trade with confidence.',
  foundingDate: '2026',
  sameAs: [],
}

export default function LandingPage() {
  useEffect(() => {
    // Inject JSON-LD structured data for SEO/AEO
    const injectSchema = (schema: object, id: string) => {
      const existing = document.getElementById(id)
      if (existing) existing.remove()
      const script = document.createElement('script')
      script.id = id
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    }

    injectSchema(faqSchema, 'neoa-faq-schema')
    injectSchema(orgSchema, 'neoa-org-schema')

    // Update page title & meta for landing
    document.title = 'Neoa — Discover, Buy, Sell & Get Services Securely'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Africa\'s premier escrow marketplace. Shop products, hire professionals, and connect with trusted vendors. Every transaction is securely protected.')
    }

    return () => {
      document.getElementById('neoa-faq-schema')?.remove()
      document.getElementById('neoa-org-schema')?.remove()
    }
  }, [])

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* Navigation */}
      <Navbar />

      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 2. Live Feed Preview */}
        <LiveFeed />

        {/* 3. Category Marquee */}
        <CategoryMarquee />

        {/* 4. Escrow Trust */}
        <EscrowTrust />

        {/* 5. How It Works */}
        <HowItWorks />

        {/* 6. Why Neoa */}
        <WhyNeoa />

        {/* 7. Testimonials + Stats */}
        <Testimonials />


        {/* 9. FAQ */}
        <FAQ />

        {/* 10. Final CTA */}
        <CTABanner />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
