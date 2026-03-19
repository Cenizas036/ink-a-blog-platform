import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import useAuthStore from '../store/authStore'
import { useToast } from './Toast'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    toast.info('Signed out.')
    navigate('/')
  }

  const avatarLetter = user && user.username ? user.username[0].toUpperCase() : '?'

  return (
    <motion.nav
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        background: 'rgba(8,8,8,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      initial={{ y: -70 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textShadow: '0 0 30px rgba(201,168,76,0.4)' }}>
            INK
          </Link>
        </motion.div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[['/', 'Home'], ['/write', 'Write']].map(([path, label]) => (
            <motion.div key={path} whileHover={{ y: -1 }}>
              <Link to={path} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: 'var(--radius)', transition: 'color 0.2s', display: 'block' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {label}
              </Link>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <motion.button
                onClick={() => setMenuOpen(o => !o)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{ width: 48, height: 48, borderRadius: '50%', background: user.avatar_url ? 'transparent' : 'var(--accent-dim)', border: '2px solid var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 20px rgba(201,168,76,0.3)', padding: 0 }}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>
                    {avatarLetter}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', right: 0, top: 'calc(100% + 12px)', background: 'rgba(14,12,10,0.97)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 8, minWidth: 180, boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)' }}
                  >
                    <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{user.username}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
                    </div>
                    <button onClick={() => { navigate('/profile/' + user.username); setMenuOpen(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >My Profile</button>
                    <button onClick={() => { navigate('/write'); setMenuOpen(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >+ New Post</button>
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                      <button onClick={handleLogout}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                      >Sign out</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <motion.div whileHover={{ y: -1 }}>
                <Link to="/auth" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', padding: '8px 14px' }}>Sign in</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/auth?mode=register" className="btn btn-primary" style={{ fontSize: 12 }}>Join</Link>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  )
}