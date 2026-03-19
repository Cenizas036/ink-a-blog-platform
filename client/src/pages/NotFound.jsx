import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(6rem, 15vw, 10rem)', fontWeight: 700, color: 'var(--border)', lineHeight: 1, marginBottom: 24, letterSpacing: '-0.04em' }}>
          404
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
          This page doesn't exist.
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 32 }}>
          The post was deleted, the link is wrong, or you wandered too far.
        </p>
        <Link to="/" className="btn btn-primary">← Back to feed</Link>
      </motion.div>
    </div>
  )
}