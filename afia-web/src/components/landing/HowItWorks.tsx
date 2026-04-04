import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MessageCircle, ShieldCheck, PackageCheck, Store, ListPlus, Bell, Banknote } from 'lucide-react'

const customerSteps = [
  { icon: Search, title: 'Discover Products', desc: 'Browse posts or products from trusted vendors on the Neoa feed. Find exactly what you need — from fashion to electronics to professional services.' },
  { icon: MessageCircle, title: 'Connect with Vendor', desc: 'Chat directly with any vendor to agree on what you need. Ask questions, negotiate, and get all the details you need before paying.' },
  { icon: ShieldCheck, title: 'Pay Securely', desc: 'Make a secure payment through Neoa. Your funds are safely held in escrow until you confirm that you\'re satisfied with your order.' },
  { icon: PackageCheck, title: 'Receive & Confirm', desc: 'Get your order delivered or your service completed. Once you confirm satisfaction, the vendor gets paid. It\'s that simple!' },
]

const vendorSteps = [
  { icon: Store, title: 'Create Your Store', desc: 'Sign up as a vendor, verify your identity, and set up your professional storefront in just a few minutes. It\'s quick and completely free to start.' },
  { icon: ListPlus, title: 'List Products or Services', desc: 'Upload your products or services with detailed descriptions, images, and pricing. Reach thousands of customers actively looking for what you offer.' },
  { icon: Bell, title: 'Receive Orders', desc: 'Get notified instantly when a customer places an order or sends you a request. Respond quickly to maximise your sales and build your reputation.' },
  { icon: Banknote, title: 'Get Paid Securely', desc: 'Once the customer confirms delivery or satisfaction, your payment is released automatically to your bank account. Guaranteed, every time.' },
]

export default function HowItWorks() {
  const [tab, setTab] = useState<'customers' | 'vendors'>('customers')
  const steps = tab === 'customers' ? customerSteps : vendorSteps

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 px-6"
      style={{ background: 'white' }}
      aria-label="How Neoa works"
    >
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-2xl md:text-4xl mb-3"
          style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
        >
          Shop or book a service{' '}
          <span style={{ color: '#C5A059' }}>in just 4 steps</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-sm md:text-base mb-8 max-w-xl mx-auto"
          style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
        >
          From discovery to payment, Neoa makes every step quick, easy, and seamless.
        </motion.p>

        {/* Toggle */}
        <div className="toggle-group mb-12">
          <button
            className={`toggle-btn ${tab === 'customers' ? 'active' : ''}`}
            onClick={() => setTab('customers')}
          >
            For Customers
          </button>
          <button
            className={`toggle-btn ${tab === 'vendors' ? 'active' : ''}`}
            onClick={() => setTab('vendors')}
          >
            For Vendors
          </button>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.article
                  key={step.title}
                  className="step-card relative text-left"
                  style={{ padding: '2rem 1.5rem 2.5rem' }}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <div className="step-number">{i + 1}</div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: '#fef3c7' }}
                  >
                    <Icon size={22} color="#C5A059" />
                  </div>
                  <h3
                    className="text-base font-semibold mb-3"
                    style={{ fontFamily: 'var(--font-body)', color: '#1A2332' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
                    {step.desc}
                  </p>
                </motion.article>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
