import { motion } from 'framer-motion'
import { Search, MessageCircle, ShieldCheck, BadgeCheck } from 'lucide-react'

const features = [
  {
    icon: Search,
    title: 'Smarter Product & Service Discovery',
    desc: 'Browse real-time posts from vendors, see updates instantly, and find exactly what you need without stress.',
    bg: 'linear-gradient(135deg, #1A2332 0%, #243044 100%)',
    color: 'white',
  },
  {
    icon: MessageCircle,
    title: 'Instant Communication With Vendors',
    desc: 'Chat directly with any vendor, negotiate prices, ask questions, and finalize details — all before you pay.',
    bg: 'linear-gradient(135deg, #fafaf9 0%, #fef3c7 100%)',
    color: '#1A2332',
  },
  {
    icon: ShieldCheck,
    title: 'Safe & Secure Payments',
    desc: 'Every transaction is protected through our secure escrow system. Your money is safe until you confirm satisfaction.',
    bg: 'linear-gradient(135deg, #fafaf9 0%, #f5f0e4 100%)',
    color: '#1A2332',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Vendors & Trusted Marketplace',
    desc: 'We verify every vendor\'s identity and use advanced systems to detect fraud — keeping the marketplace clean and safe for everyone.',
    bg: 'linear-gradient(135deg, #1A2332 0%, #243044 100%)',
    color: 'white',
  },
]

export default function WhyNeoa() {
  return (
    <section
      id="why-neoa"
      className="py-16 md:py-24 px-6"
      style={{ background: 'white' }}
      aria-label="Why choose Neoa marketplace"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold mb-3 px-4 py-1.5 rounded-full"
            style={{ background: '#fef3c7', color: '#C5A059', fontFamily: 'var(--font-body)' }}
          >
            ✦ Why Choose Neoa?
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-2xl md:text-4xl mb-3"
            style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
          >
            A Better Way to{' '}
            <span style={{ color: '#C5A059' }}>Shop and Connect</span>
            <br className="hidden sm:block" />
            with professional stores and talents
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm md:text-base max-w-2xl mx-auto"
            style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            Neoa gives you a smooth, trusted experience from discovery to payment,
            so you shop with confidence on every order.
          </motion.p>
        </div>

        <div className="bento-grid">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.article
                key={f.title}
                className="bento-card p-8"
                style={{ background: f.bg }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: f.color === 'white' ? 'rgba(255,255,255,0.1)' : '#fef3c7',
                  }}
                >
                  <Icon size={20} color="#C5A059" />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: 'var(--font-body)', color: f.color }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: f.color === 'white' ? 'rgba(255,255,255,0.7)' : '#6b7280',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.7,
                  }}
                >
                  {f.desc}
                </p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
