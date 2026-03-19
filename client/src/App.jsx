import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import { ToastProvider } from './components/Toast'
import { LoginSuccessOverlay } from './components/LoginSuccess'
import Feed from './pages/Feed'
import PostPage from './pages/PostPage'
import Write from './pages/Write'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import useAuthStore from './store/authStore'

export const BG_FEED = 'https://res.cloudinary.com/do0dfbjqs/image/upload/v1773864434/ChatGPT_Image_Mar_19_2026_12_40_16_AM_a8h6kk.png'
export const BG_LIBRARY = 'https://res.cloudinary.com/do0dfbjqs/image/upload/v1773864434/ChatGPT_Image_Mar_19_2026_01_29_24_AM_zj6oya.png'

export function PageWrapper({ children, bg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        backgroundImage: `url(${bg})`,
        backgroundSize: bg === BG_FEED ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: bg === BG_FEED ? 'no-repeat' : 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#080808',
}} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: bg === BG_FEED ? 'rgba(8,8,8,0.52)' : 'rgba(8,8,8,0.75)',
      }} />
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper bg={BG_FEED}><Feed /></PageWrapper>} />
        <Route path="/post/:slug" element={<PageWrapper bg={BG_LIBRARY}><PostPage /></PageWrapper>} />
        <Route path="/write" element={<PageWrapper bg={BG_LIBRARY}><Write /></PageWrapper>} />
        <Route path="/auth" element={<PageWrapper bg={BG_LIBRARY}><Auth /></PageWrapper>} />
        <Route path="/profile/:username" element={<PageWrapper bg={BG_LIBRARY}><Profile /></PageWrapper>} />
        <Route path="*" element={<PageWrapper bg={BG_LIBRARY}><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  )
}

function AppInner() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [])
  return (
    <>
      <Navbar />
      <LoginSuccessOverlay />
      <AnimatedRoutes />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </BrowserRouter>
  )
}