import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const customerFaqs = [
  {
    q: 'Is my payment safe when I pay on Neoa?',
    a: 'Absolutely. When you pay on Neoa, your money is held securely in escrow — meaning the vendor doesn\'t receive it until you confirm you\'re satisfied with your order or service. If something goes wrong, our dispute resolution team steps in to help.',
  },
  {
    q: 'How does the escrow protection work?',
    a: 'It\'s simple: you pay, we hold the funds safely. The vendor fulfils your order, you confirm delivery and satisfaction, then we release the payment to the vendor. This protects both sides of every transaction.',
  },
  {
    q: 'Can I chat with a vendor before making payment?',
    a: 'Yes! We encourage it. You can message any vendor directly to ask questions, negotiate prices, clarify details, or request customisations — all before committing to a purchase.',
  },
  {
    q: 'What happens if there\'s an issue with my order?',
    a: 'You can open a dispute directly from your order page. Our team will review the situation and work with both parties to reach a fair resolution. Until it\'s resolved, your payment stays safely held in escrow.',
  },
  {
    q: 'Is it free to buy on Neoa?',
    a: 'Yes, completely free. Browsing, chatting, and placing orders on Neoa costs you nothing. The only cost is the price of the product or service you purchase from the vendor.',
  },
  {
    q: 'How do I know if a vendor is trustworthy?',
    a: 'Every vendor on Neoa goes through an identity verification process. Look for the verified badge on their profile. Plus, our fraud detection systems and the escrow protection work together to keep you safe.',
  },
  {
    q: 'Can I buy from vendors in other countries?',
    a: 'Yes! Neoa supports cross-border transactions with multi-currency settlement. You can buy from verified vendors anywhere, and the escrow protection applies to every transaction regardless of location.',
  },
]

const vendorFaqs = [
  {
    q: 'How do I start selling on Neoa?',
    a: 'It takes just a few minutes. Sign up, choose "Vendor" as your account type, complete your identity verification, and you\'re ready to start listing products or services immediately. It\'s completely free to get started.',
  },
  {
    q: 'When do I receive payment for my orders?',
    a: 'You receive payment as soon as the customer confirms delivery or satisfaction. The funds are then automatically released to your linked bank account — no delays, no hassle.',
  },
  {
    q: 'What does Neoa charge vendors?',
    a: 'Neoa charges a small commission on each successful transaction. There are no monthly subscription fees, no hidden charges, and no upfront costs. You only pay when you make a sale — so you can focus on growing your business risk-free.',
  },
  {
    q: 'How do I get more visibility for my products?',
    a: 'Post consistently, respond quickly to customer requests, and keep your listings fresh with great photos and descriptions. Active vendors naturally rank higher in the Neoa feed, reaching more potential customers.',
  },
  {
    q: 'What is the identity verification process?',
    a: 'We use a secure, automated identity check to verify your details. This builds trust with customers and keeps the marketplace safe. It takes just a few minutes and your information is fully protected.',
  },
  {
    q: 'Can I withdraw my earnings anytime?',
    a: 'Yes! Once funds are released after a confirmed order, you can withdraw your earnings directly to your linked bank account whenever you want.',
  },
  {
    q: 'Can I sell services as well as products?',
    a: 'Absolutely. Neoa supports both product listings and service offerings. Whether you\'re a graphic designer, tailor, hair stylist, or consultant — you can list your services and receive payments through the same secure escrow system.',
  },
]

export default function FAQ() {
  const [tab, setTab] = useState<'customers' | 'vendors'>('customers')
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const faqs = tab === 'customers' ? customerFaqs : vendorFaqs

  const toggle = (i: number) => setOpenIdx(openIdx === i ? null : i)

  return (
    <section
      id="faq"
      className="py-16 md:py-24 px-6"
      style={{ background: 'white' }}
      aria-label="Frequently Asked Questions"
    >
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Left copy */}
        <div className="lg:max-w-sm flex-shrink-0">
          <motion.span
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold mb-3 px-4 py-1.5 rounded-full"
            style={{ background: '#fef3c7', color: '#C5A059', fontFamily: 'var(--font-body)' }}
          >
            ✦ FAQ
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-3xl mb-3"
            style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
          >
            Got Questions?
            <br />
            <span style={{ color: '#C5A059' }}>We've Got Answers</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm mb-6"
            style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            From how payments work to connecting with vendors, here's everything to help you get started with confidence.
          </motion.p>
          <div className="toggle-group">
            <button className={`toggle-btn ${tab === 'customers' ? 'active' : ''}`} onClick={() => { setTab('customers'); setOpenIdx(null) }}>
              For Customers
            </button>
            <button className={`toggle-btn ${tab === 'vendors' ? 'active' : ''}`} onClick={() => { setTab('vendors'); setOpenIdx(null) }}>
              For Vendors
            </button>
          </div>
        </div>

        {/* Right accordion */}
        <div className="flex-1">
          {faqs.map((faq, i) => (
            <div key={`${tab}-${i}`} className="faq-item">
              <button
                className={`faq-question ${openIdx === i ? 'open' : ''}`}
                onClick={() => toggle(i)}
                aria-expanded={openIdx === i}
              >
                <span>{faq.q}</span>
                <ChevronDown size={18} color="#9ca3af" className="chevron" />
              </button>
              <div className={`faq-answer ${openIdx === i ? 'open' : ''}`}>
                <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
