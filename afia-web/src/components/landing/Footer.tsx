import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()
  const navigate = useNavigate()

  const companyLinks = [
    { label: 'Why Neoa', href: '#why-neoa', isAnchor: true },
    { label: 'How It Works', href: '#how-it-works', isAnchor: true },
    { label: 'FAQ', href: '#faq', isAnchor: true },
  ]

  const legalLinks = [
    { label: 'Terms of Service', href: '/terms', isAnchor: false },
    { label: 'Privacy Policy', href: '/privacy', isAnchor: false },
  ]

  const handleClick = (href: string, isAnchor: boolean) => {
    if (isAnchor) {
      if (href && href !== '#' && href.length > 1) {
        const el = document.querySelector(href)
        el?.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      navigate(href)
    }
  }

  return (
    <footer className="landing-footer py-12 md:py-16 px-6" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-10 md:gap-20 mb-10">
          {/* Brand */}
          <div className="md:max-w-sm">
            <span
              className="text-2xl font-bold tracking-tight block mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: '#C5A059' }}
            >
              Neoa
            </span>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
              Discover products, connect with vendors, and pay securely — all in one trusted marketplace.
              Neoa makes online transactions effortless.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {['X', 'IG', 'in', 'fb'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#E5E7EB', fontFamily: 'var(--font-body)' }}
                  aria-label={`Follow us on ${s}`}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="flex gap-16">
            {/* Company */}
            <div>
              <h4
                className="text-sm font-semibold mb-4"
                style={{ color: 'white', fontFamily: 'var(--font-body)' }}
              >
                Company
              </h4>
              <ul className="space-y-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleClick(link.href, link.isAnchor)}
                      className="bg-transparent border-none cursor-pointer text-sm p-0"
                      style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4
                className="text-sm font-semibold mb-4"
                style={{ color: 'white', fontFamily: 'var(--font-body)' }}
              >
                Legal
              </h4>
              <ul className="space-y-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleClick(link.href, link.isAnchor)}
                      className="bg-transparent border-none cursor-pointer text-sm p-0"
                      style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 text-center text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}
        >
          © {year} Neoa. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
