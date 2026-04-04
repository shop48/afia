import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Users } from 'lucide-react'
import heroCustomers from '../../assets/landing/hero-customers.png'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export default function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="hero-section pt-28 pb-16 md:pt-36 md:pb-24 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
        {/* ── Left: Copy ── */}
        <div className="flex-1 text-center lg:text-left">
          <motion.h1
            custom={0} initial="hidden" animate="visible" variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)', color: 'white', fontWeight: 700 }}
          >
            Discover, Buy, Sell{' '}
            <span style={{ color: '#C5A059' }}>&amp; Get Services</span>
            <br />All Securely Protected
          </motion.h1>

          <motion.p
            custom={1} initial="hidden" animate="visible" variants={fadeUp}
            className="text-base md:text-lg mb-8 max-w-xl mx-auto lg:mx-0"
            style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}
          >
            Shop products, hire professionals, and connect with trusted vendors around you.
            Every payment is held securely until you're satisfied.
          </motion.p>

          <motion.div
            custom={2} initial="hidden" animate="visible" variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/catalog')}
              className="border-none cursor-pointer text-base font-semibold"
              style={{
                background: '#C5A059', color: '#1A2332',
                padding: '0.85rem 2rem', borderRadius: '999px',
                fontFamily: 'var(--font-body)',
              }}
            >
              Start Shopping
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="cursor-pointer text-base font-semibold"
              style={{
                background: 'transparent', color: 'white',
                padding: '0.85rem 2rem', borderRadius: '999px',
                border: '1.5px solid rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Become a Vendor
            </motion.button>
          </motion.div>

          <motion.div
            custom={3} initial="hidden" animate="visible" variants={fadeUp}
            className="flex items-center gap-3 justify-center lg:justify-start"
          >
            <div className="flex -space-x-2">
              {['#C5A059', '#D4B778', '#A8873D'].map((c, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                  style={{ background: c, borderColor: '#1A2332' }}
                >
                  <Users size={14} color="white" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="pulse-dot" />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
                <strong style={{ color: 'white' }}>12k+</strong> customers and vendors
              </span>
            </div>
          </motion.div>
        </div>

        {/* ── Right: Happy Customers Image ── */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }}
          className="flex-1 flex justify-center items-center relative"
        >
          <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ maxWidth: '520px' }}>
            <img
              src={heroCustomers}
              alt="Happy Neoa customers and vendors celebrating successful transactions"
              className="w-full h-auto"
              style={{ display: 'block' }}
            />
          </div>
          {/* Trust badge floating */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="absolute -bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
          >
            <ShieldCheck size={16} color="#C5A059" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1A2332', fontFamily: 'var(--font-body)' }}>
              Escrow Protected
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
