import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import feedJewelry from '../../assets/landing/feed-jewelry.png'
import feedHeadphones from '../../assets/landing/feed-headphones.png'
import feedAgbada from '../../assets/landing/feed-agbada.png'
import feedLeatherBag from '../../assets/landing/feed-leather-bag.png'
import feedDesk from '../../assets/landing/feed-desk.png'

const feedItems = [
  { title: 'Handmade Gold Necklace', vendor: 'Adaeze Jewels', price: '₦45,000', cat: 'Jewelry', color: '#C5A059', img: feedJewelry },
  { title: 'Premium Noise-Cancelling Headphones', vendor: 'TechHub NG', price: '₦32,000', cat: 'Electronics', color: '#1A2332', img: feedHeadphones },
  { title: 'Custom Agbada Set', vendor: 'Royal Fabrics', price: '₦85,000', cat: 'Fashion', color: '#C5A059', img: feedAgbada },
  { title: 'Organic Shea Butter Collection', vendor: 'Nature\'s Best', price: '₦12,500', cat: 'Beauty', color: '#A8873D', img: feedJewelry },
  { title: 'Minimalist Wooden Desk', vendor: 'CraftWood Studio', price: '₦120,000', cat: 'Furniture', color: '#1A2332', img: feedDesk },
  { title: 'Vintage Leather Bag', vendor: 'Heritage Leathers', price: '₦28,000', cat: 'Fashion', color: '#C5A059', img: feedLeatherBag },
  { title: 'Smart Fitness Watch', vendor: 'GadgetWorld', price: '₦55,000', cat: 'Gadgets', color: '#1A2332', img: feedHeadphones },
  { title: 'Ankara Print Dress', vendor: 'Bola\'s Closet', price: '₦18,000', cat: 'Fashion', color: '#A8873D', img: feedAgbada },
  { title: 'Home Cleaning Service', vendor: 'SparkleClean Pro', price: '₦15,000', cat: 'Services', color: '#C5A059', img: feedDesk },
  { title: 'Brand Identity Package', vendor: 'PixelCraft Design', price: '₦75,000', cat: 'Services', color: '#1A2332', img: feedLeatherBag },
]

const row1 = [...feedItems, ...feedItems]
const row2 = [...feedItems.slice().reverse(), ...feedItems.slice().reverse()]

function FeedCard({ item }: { item: typeof feedItems[0] }) {
  return (
    <article className="feed-card">
      <img
        src={item.img}
        alt={item.title}
        className="feed-card-image"
      />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: item.color, color: 'white', fontFamily: 'var(--font-body)', fontSize: '0.6rem' }}
          >
            {item.vendor[0]}
          </div>
          <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}>
            {item.vendor}
          </span>
        </div>
        <h4
          className="text-sm font-semibold mb-1 truncate"
          style={{ fontFamily: 'var(--font-body)', color: '#1A2332' }}
        >
          {item.title}
        </h4>
        <span
          className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block"
          style={{ background: `${item.color}15`, color: item.color, fontFamily: 'var(--font-body)' }}
        >
          {item.cat}
        </span>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold" style={{ color: '#1A2332', fontFamily: 'var(--font-heading)' }}>
            {item.price}
          </span>
          <div className="flex items-center gap-3">
            <Heart size={14} color="#D1D5DB" />
            <MessageCircle size={14} color="#D1D5DB" />
            <Share2 size={14} color="#D1D5DB" />
          </div>
        </div>
      </div>
    </article>
  )
}

export default function LiveFeed() {
  return (
    <section className="py-16 md:py-20 overflow-hidden" style={{ background: 'white' }} aria-label="Live marketplace feed">
      <div className="max-w-4xl mx-auto text-center px-6 mb-10">
        <motion.span
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-block text-xs font-semibold mb-3 px-4 py-1.5 rounded-full"
          style={{ background: '#fef3c7', color: '#C5A059', fontFamily: 'var(--font-body)' }}
        >
          ✦ Neoa Feed
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-2xl md:text-4xl mb-3"
          style={{ fontFamily: 'var(--font-heading)', color: '#1A2332' }}
        >
          See <span style={{ color: '#C5A059' }}>vendor offers</span> and customer
          <br className="hidden sm:block" /> requests <span style={{ color: '#C5A059' }}>in real time</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-sm md:text-base max-w-2xl mx-auto"
          style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}
        >
          Browse products, services, and requests in a social-style feed designed to make connections and transactions effortless.
        </motion.p>
      </div>

      {/* Row 1 */}
      <div className="mb-4 overflow-hidden">
        <div className="marquee-track feed-marquee-left">
          {row1.map((item, i) => (
            <FeedCard key={`fr1-${i}`} item={item} />
          ))}
        </div>
      </div>

      {/* Row 2 */}
      <div className="overflow-hidden">
        <div className="marquee-track feed-marquee-right">
          {row2.map((item, i) => (
            <FeedCard key={`fr2-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
