import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'

export function LoginSuccessOverlay() {
  const user = useAuthStore(s => s.user)
  const [show, setShow] = useState(false)
  const [prevUser, setPrevUser] = useState(null)

  useEffect(() => {
    if (user && !prevUser) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 2800)
      return () => clearTimeout(t)
    }
    setPrevUser(user)
  }, [user])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(8,8,8,0.85)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{ textAlign: 'center' }}
          >
            {/* Ink drop animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #d4b86a, #c9a84c)',
                margin: '0 auto 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 60px rgba(201,168,76,0.5)',
                fontSize: 40,
              }}
            >
              ✦
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--accent)',
                marginBottom: 8,
                letterSpacing: '-0.01em',
              }}
            >
              Welcome back.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {user?.username}
            </motion.p>

            {/* Ripple rings */}
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
                transition={{ delay: 0.1 * i, duration: 1.2, repeat: 0 }}
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 100, height: 100,
                  borderRadius: '50%',
                  border: '2px solid var(--accent)',
                  pointerEvents: 'none',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}