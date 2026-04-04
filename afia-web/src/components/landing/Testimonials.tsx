import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Users, ShoppingBag, Store, CheckCircle2 } from 'lucide-react'

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
          setCount(Math.floor(eased * target))
          if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { count, ref }
}

const stats = [
  { icon: Users, target: 10000, label: 'Daily Users', suffix: '+' },
  { icon: ShoppingBag, target: 12000, label: 'Customers', suffix: '+' },
  { icon: Store, target: 5000, label: 'Vendors', suffix: '+' },
  { icon: CheckCircle2, target: 20000, label: 'Successful Orders', suffix: '+' },
]

const testimonials = [
  { name: 'Amina Okafor', role: 'Customer', text: 'I was nervous buying from someone I didn\'t know, but Neoa\'s escrow system gave me complete peace of mind. I only released payment after I received my order in perfect condition.' },
  { name: 'Chukwuemeka Eze', role: 'Vendor', text: 'Setting up my store was incredibly easy. Within a week I had my first order. The best part? I always get paid — the escrow system protects both sides.' },
  { name: 'Fatima Abdullahi', role: 'Customer', text: 'I love being able to chat with vendors before buying. It feels like shopping at a real store. Found an amazing jeweller through Neoa and I\'m a repeat customer now!' },
  { name: 'David Okonkwo', role: 'Vendor', text: 'As a graphic designer, Neoa helped me find clients I never would have reached otherwise. The platform is clean, professional, and payments always come through.' },
  { name: 'Blessing Adekunle', role: 'Customer', text: 'What I appreciate most is the trust. Every vendor is verified, every payment is protected. I\'ve recommended Neoa to all my friends and family.' },
  { name: 'Yusuf Ibrahim', role: 'Vendor', text: 'I switched from other platforms because Neoa treats vendors fairly. Low fees, guaranteed payments, and amazing support. My sales have grown 3x in 6 months.' },
  { name: 'Grace Nnamdi', role: 'Customer', text: 'Bought custom traditional attire through Neoa and the whole experience was seamless — from chatting with the tailor to getting exactly what I wanted delivered.' },
  { name: 'Kelechi Obi', role: 'Vendor', text: 'Neoa has been a game-changer for my business. Priority listing means more eyes on my products, and the analytics help me understand what customers actually want.' },
]

const duplicated = [...testimonials, ...testimonials]

export default function Testimonials() {
  return (
    <section
      className="py-16 md:py-24 overflow-hidden"
      style={{ background: '#faf9f6' }}
      aria-label="Customer and vendor testimonials"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12">
          <div className="md:max-w-md">
            <motion.span
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-xs font-semibold mb-3 px-4 py-1.5 rounded-full"
              style={{ background: '#fef3c7', color: '#C5A059', fontFamily: 'var(--font-body)' }}
            >
              ✦ Testimonials
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="text-2xl md:text-4xl mb-3"
              style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
            >
              Real stories from buyers and vendors
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm md:text-base md:max-w-sm md:text-right"
            style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            People love Neoa because it makes buying and selling simpler, safer, and more enjoyable.
          </motion.p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-14 p-6 md:p-8 rounded-2xl" style={{ background: '#1A2332' }}>
          {stats.map((s) => {
            const { count, ref } = useCountUp(s.target)
            const Icon = s.icon
            return (
              <div key={s.label} ref={ref} className="stat-item flex flex-col items-center">
                <Icon size={20} color="#C5A059" className="mb-2" />
                <span className="stat-number">
                  {count.toLocaleString()}{s.suffix}
                </span>
                <span className="stat-label">{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrolling testimonials */}
      <div className="overflow-hidden">
        <div className="testimonial-track">
          {duplicated.map((t, i) => (
            <article key={`t-${i}`} className="testimonial-card">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: '#C5A059', color: '#1A2332', fontFamily: 'var(--font-body)' }}
                >
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: '#C5A059', fontFamily: 'var(--font-body)' }}>
                    {t.role}
                  </p>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
                {t.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
