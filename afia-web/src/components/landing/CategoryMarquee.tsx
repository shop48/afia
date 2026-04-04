import { motion } from 'framer-motion'
import {
  Heart, ShoppingBag, Palette, Gem, Shirt, Monitor,
  Sparkles, Home, UtensilsCrossed, Dumbbell, BookOpen,
  Scissors, Camera, Wrench, Paintbrush, PenTool
} from 'lucide-react'

const categories = [
  { name: 'Fashion & Apparel', icon: Shirt, color: '#C5A059' },
  { name: 'Electronics', icon: Monitor, color: '#1A2332' },
  { name: 'Beauty & Health', icon: Sparkles, color: '#D4B778' },
  { name: 'Jewelry', icon: Gem, color: '#C5A059' },
  { name: 'Home & Living', icon: Home, color: '#A8873D' },
  { name: 'Art & Crafts', icon: Palette, color: '#1A2332' },
  { name: 'Food & Beverage', icon: UtensilsCrossed, color: '#C5A059' },
  { name: 'Sports & Fitness', icon: Dumbbell, color: '#A8873D' },
  { name: 'Books & Media', icon: BookOpen, color: '#1A2332' },
  { name: 'Graphics Design', icon: Paintbrush, color: '#C5A059' },
  { name: 'Video Editing', icon: Camera, color: '#A8873D' },
  { name: 'Web Design', icon: PenTool, color: '#1A2332' },
  { name: 'Copy Writing', icon: BookOpen, color: '#C5A059' },
  { name: 'Tailoring', icon: Scissors, color: '#D4B778' },
  { name: 'Gadgets', icon: Monitor, color: '#1A2332' },
  { name: 'Furniture', icon: Home, color: '#A8873D' },
  { name: 'Handmade', icon: Heart, color: '#C5A059' },
  { name: 'Repair Services', icon: Wrench, color: '#1A2332' },
  { name: 'Shopping', icon: ShoppingBag, color: '#C5A059' },
]

const row1 = [...categories, ...categories]
const row2 = [...categories.slice().reverse(), ...categories.slice().reverse()]

export default function CategoryMarquee() {
  return (
    <section className="py-16 md:py-20 overflow-hidden" style={{ background: '#FAFAFA' }}>
      <div className="max-w-4xl mx-auto text-center px-6 mb-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-2xl md:text-4xl mb-4"
          style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
        >
          Find what you need —{' '}
          <span style={{ color: '#C5A059' }}>Neoa has you covered</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-sm md:text-base max-w-2xl mx-auto"
          style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
        >
          From fashion to electronics, professional services to artisan crafts — discover everything in one trusted place.
        </motion.p>
      </div>

      <div className="mb-3 overflow-hidden">
        <div className="marquee-track marquee-left">
          {row1.map((cat, i) => {
            const Icon = cat.icon
            return (
              <span
                key={`r1-${i}`}
                className="category-pill flex items-center gap-2"
                style={{ borderColor: cat.color, color: cat.color, background: `${cat.color}08` }}
              >
                <Icon size={14} />
                {cat.name}
              </span>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="marquee-track marquee-right">
          {row2.map((cat, i) => {
            const Icon = cat.icon
            return (
              <span
                key={`r2-${i}`}
                className="category-pill flex items-center gap-2"
                style={{ borderColor: cat.color, color: cat.color, background: `${cat.color}08` }}
              >
                <Icon size={14} />
                {cat.name}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
