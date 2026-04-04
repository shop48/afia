import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

const plans = [
  {
    name: 'Free Plan',
    price: { monthly: 0, yearly: 0 },
    desc: 'Perfect to get started and test the waters.',
    features: [
      'Upload up to 5 images per post',
      'Create 5 catalogue listings',
      'Respond to 3 requests daily',
      '3 days to auto-confirm delivery',
      '5% transaction fee per order',
      '3 category selections per post',
      'Up to 5 users login',
      '1 daily withdrawal',
    ],
    featured: false,
    cta: 'Get Started Free',
  },
  {
    name: 'Starter Plan',
    price: { monthly: 5000, yearly: 50000 },
    desc: 'For growing vendors ready to scale up.',
    features: [
      'Upload up to 8 images per post',
      'Create 8 catalogue listings',
      'Respond to 8 requests daily',
      '8 days to auto-confirm delivery',
      '5% transaction fee per order',
      '6 category selections per post',
      'Up to 10 users login',
      '3 daily withdrawals',
      'Basic performance ranking',
      'Access to listing in homepage',
      'Priority customer support',
      'Standard seller badge',
      'Access to basic sales analytics',
    ],
    featured: true,
    cta: 'Subscribe',
  },
  {
    name: 'Growth Plan',
    price: { monthly: 15000, yearly: 150000 },
    desc: 'For established vendors who want maximum reach.',
    features: [
      'Upload up to 15 images per post',
      'Create unlimited catalogues',
      'Respond to unlimited requests',
      'Auto-confirm delivery: 24 hrs',
      '3% transaction fee per order',
      '10 category selections per post',
      'Unlimited users login',
      'Unlimited daily withdrawals',
      'Premium visibility boost & feed',
      'Priority listing in homepage sliders',
      'Premium customer support',
      'Early access to new features',
      'Premium vendor badge',
      'Access to premium sales analytics',
    ],
    featured: false,
    cta: 'Subscribe',
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <section
      id="pricing"
      className="py-16 md:py-24 px-6"
      style={{ background: '#FAFAFA' }}
      aria-label="Vendor pricing plans"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl mb-3"
            style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
          >
            Built to Help{' '}
            <span style={{ color: '#059669' }}>Vendors</span> Earn More
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm md:text-base mb-8 max-w-xl mx-auto"
            style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            Low, transparent fees designed to support your growth on Neoa.
          </motion.p>

          {/* Yearly toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="toggle-group">
              <button className={`toggle-btn ${!yearly ? 'active' : ''}`} onClick={() => setYearly(false)}>
                Monthly
              </button>
              <button className={`toggle-btn ${yearly ? 'active' : ''}`} onClick={() => setYearly(true)}>
                Yearly (17% off)
              </button>
            </div>
            {yearly && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: '#d1fae5', color: '#059669', fontFamily: 'var(--font-body)' }}
              >
                Save 17%
              </motion.span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, idx) => (
            <motion.article
              key={plan.name}
              className={`pricing-card ${plan.featured ? 'featured' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.12, duration: 0.5 }}
            >
              {plan.featured && (
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} color="#C5A059" />
                  <span className="text-xs font-semibold" style={{ color: '#C5A059', fontFamily: 'var(--font-body)' }}>
                    Most Popular
                  </span>
                </div>
              )}

              <p className="text-sm font-medium mb-1" style={{
                color: plan.featured ? '#C5A059' : '#059669',
                fontFamily: 'var(--font-body)',
              }}>
                {plan.name}
              </p>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl md:text-4xl font-bold" style={{
                  fontFamily: 'var(--font-heading)',
                  color: plan.featured ? 'white' : '#1A2332',
                }}>
                  ₦{(yearly ? plan.price.yearly : plan.price.monthly).toLocaleString()}
                </span>
                <span className="text-sm" style={{
                  color: plan.featured ? 'rgba(255,255,255,0.6)' : '#9ca3af',
                  fontFamily: 'var(--font-body)',
                }}>
                  /{yearly ? 'yr' : 'mth'}
                </span>
              </div>

              <p className="text-xs mb-6" style={{
                color: plan.featured ? 'rgba(255,255,255,0.6)' : '#9ca3af',
                fontFamily: 'var(--font-body)',
              }}>
                {plan.desc}
              </p>

              <ul className="space-y-2.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{
                    color: plan.featured ? 'rgba(255,255,255,0.85)' : '#4b5563',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <Check size={16} color={plan.featured ? '#C5A059' : '#059669'} className="flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-full border-none cursor-pointer text-sm font-semibold"
                style={{
                  background: plan.featured ? '#C5A059' : 'transparent',
                  color: plan.featured ? '#1A2332' : '#1A2332',
                  border: plan.featured ? 'none' : '1.5px solid #1A2332',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {plan.cta}
              </motion.button>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
