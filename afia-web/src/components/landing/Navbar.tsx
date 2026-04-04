import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Why Neoa', href: '#why-neoa' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ]

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer"
          whileHover={{ scale: 1.02 }}
        >
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)', color: '#C5A059' }}
          >
            Neoa
          </span>
        </motion.button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="bg-transparent border-none text-sm font-medium cursor-pointer transition-colors"
              style={{ color: scrolled ? '#E5E7EB' : 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
              onMouseLeave={(e) => (e.currentTarget.style.color = scrolled ? '#E5E7EB' : 'rgba(255,255,255,0.8)')}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="bg-transparent border-none text-sm font-medium cursor-pointer"
            style={{ color: '#E5E7EB', fontFamily: 'var(--font-body)' }}
          >
            Log in
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="border-none cursor-pointer text-sm font-semibold"
            style={{
              background: '#C5A059',
              color: '#1A2332',
              padding: '0.6rem 1.5rem',
              borderRadius: '999px',
              fontFamily: 'var(--font-body)',
            }}
          >
            Get Started
          </motion.button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden bg-transparent border-none cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: '#E5E7EB' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden px-6 pb-6"
          style={{ background: 'rgba(26, 35, 50, 0.98)' }}
        >
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="block w-full text-left bg-transparent border-none py-3 text-sm font-medium cursor-pointer"
              style={{ color: '#E5E7EB', fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              {l.label}
            </button>
          ))}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setMobileOpen(false); navigate('/login') }}
              className="flex-1 bg-transparent cursor-pointer text-sm font-medium py-3 rounded-full"
              style={{ color: '#E5E7EB', border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)' }}
            >
              Log in
            </button>
            <button
              onClick={() => { setMobileOpen(false); navigate('/signup') }}
              className="flex-1 border-none cursor-pointer text-sm font-semibold py-3 rounded-full"
              style={{ background: '#C5A059', color: '#1A2332', fontFamily: 'var(--font-body)' }}
            >
              Get Started
            </button>
          </div>
        </motion.div>
      )}
    </nav>
  )
}
