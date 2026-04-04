import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function CTABanner() {
  const navigate = useNavigate()

  return (
    <section className="cta-section py-16 md:py-24 px-6" aria-label="Get started with Neoa">
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-2xl md:text-4xl mb-4"
          style={{ fontFamily: 'var(--font-heading)', color: 'white' }}
        >
          Start buying and selling{' '}
          <span style={{ color: '#C5A059' }}>with confidence</span> on Neoa
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-sm md:text-base mb-8 max-w-xl mx-auto"
          style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)' }}
        >
          Join a trusted marketplace where discovery, conversation, and secure payments
          come together — making every transaction simple and safe.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/catalog')}
            className="border-none cursor-pointer text-sm font-semibold"
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
            className="cursor-pointer text-sm font-semibold"
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
      </div>
    </section>
  )
}
