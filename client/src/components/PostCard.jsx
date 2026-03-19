import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function PostCard({ post, index = 0 }) {
  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/post/${post.slug}`}>
        <div className="card" style={{ padding: 0 }}>
          {post.cover_image && (
            <div style={{ height: 200, overflow: 'hidden' }}>
              <img
                src={post.cover_image}
                alt={post.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>
          )}
          <div style={{ padding: '24px' }}>
            {post.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {post.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 600,
              lineHeight: 1.3,
              marginBottom: 8,
              color: 'var(--text-primary)',
            }}>
              {post.title}
            </h2>
            {post.excerpt && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                {post.excerpt.slice(0, 120)}...
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase',
                }}>
                  {post.author_username?.[0] || '?'}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {post.author_username}
                </span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{date}</span>
                {post.read_time && <span>{post.read_time} min read</span>}
                {post.like_count > 0 && <span>♥ {post.like_count}</span>}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}