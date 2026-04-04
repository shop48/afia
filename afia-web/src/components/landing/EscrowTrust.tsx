import { motion } from 'framer-motion'
import { CreditCard, Lock, PackageCheck, Banknote } from 'lucide-react'

const steps = [
  {
    icon: CreditCard,
    title: 'Payment Made',
    desc: 'The customer completes their payment securely on Neoa using their preferred payment method.',
  },
  {
    icon: Lock,
    title: 'Held in Escrow',
    desc: 'The payment is safely held by Neoa while the vendor prepares and fulfils the order or service.',
  },
  {
    icon: PackageCheck,
    title: 'Order Confirmed',
    desc: 'The customer confirms delivery or service completion, indicating satisfaction with the order.',
  },
  {
    icon: Banknote,
    title: 'Payment Released',
    desc: 'Once confirmed, the payment is automatically released to the vendor — simple, fair, and transparent.',
  },
]

export default function EscrowTrust() {
  return (
    <section
      id="escrow"
      className="py-16 md:py-24 px-6"
      style={{ background: '#FAFAFA' }}
      aria-label="Secure escrow payment process"
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
        <div className="flex-1">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl mb-3"
            style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
          >
            A <span style={{ color: '#C5A059' }}>secure payment</span> process you can trust
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm md:text-base mb-10 max-w-md"
            style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            Your money is protected every step of the way, ensuring fair, transparent transactions for both buyers and vendors.
          </motion.p>

          <div className="escrow-timeline">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  className="timeline-step"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                >
                  <div className="timeline-dot" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={18} color="#C5A059" />
                      <h3
                        className="text-base font-semibold"
                        style={{ fontFamily: 'var(--font-body)', color: '#1A2332', margin: 0 }}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 w-full"
        >
          <div
            className="rounded-2xl p-8 md:p-10"
            style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 50%, #fafaf9 100%)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#C5A059' }}>
                <Lock size={18} color="white" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#C5A059', fontFamily: 'var(--font-body)' }}>
                  Escrow Protection
                </p>
                <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                  Active on every transaction
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                  Order #NEO-4821
                </span>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: '#fef3c7', color: '#C5A059', fontFamily: 'var(--font-body)' }}
                >
                  Payment Secured
                </span>
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: '#1A2332', fontFamily: 'var(--font-heading)' }}>
                ₦65,000
              </p>
              <p className="text-xs" style={{ color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
                Held safely until you confirm delivery
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                  Order #NEO-4798
                </span>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: '#f0f0f0', color: '#1A2332', fontFamily: 'var(--font-body)' }}
                >
                  Funds Released
                </span>
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: '#1A2332', fontFamily: 'var(--font-heading)' }}>
                ₦32,500
              </p>
              <p className="text-xs" style={{ color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
                Vendor received payment • Completed
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
