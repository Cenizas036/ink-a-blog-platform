import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getFeed } from '../api'
import PostCard from '../components/PostCard'
import { useToast } from '../components/Toast'

const LIMIT = 9

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 22, width: '85%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 20 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 14, width: 80 }} />
        <div className="skeleton" style={{ height: 14, width: 100 }} />
      </div>
    </div>
  )
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || '')
  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const toast = useToast()

  const POPULAR_TAGS = ['technology', 'design', 'writing', 'culture', 'science', 'fiction', 'philosophy']

  const fetchPosts = useCallback(async (p = 1, reset = false) => {
    try {
      if (p === 1) setLoading(true)
      else setLoadingMore(true)

      const params = { page: p, limit: LIMIT }
      if (search) params.search = search
      if (activeTag) params.tag = activeTag

      const res = await getFeed(params)
      const newPosts = res.data.posts || []

      setPosts(prev => reset || p === 1 ? newPosts : [...prev, ...newPosts])
      setHasMore(newPosts.length === LIMIT)
      setPage(p)
    } catch (err) {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, activeTag])

  useEffect(() => {
    setPosts([])
    setPage(1)
    setHasMore(true)
    fetchPosts(1, true)
  }, [search, activeTag])

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts(page + 1)
        }
      },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, loading, page, fetchPosts])

  const handleSearch = (e) => {
    e.preventDefault()
    const val = e.target.search.value.trim()
    setSearch(val)
    setActiveTag('')
    setSearchParams(val ? { search: val } : {})
  }

  const handleTag = (tag) => {
    const next = activeTag === tag ? '' : tag
    setActiveTag(next)
    setSearch('')
    setSearchParams(next ? { tag: next } : {})
  }

  return (
    <div className="page">
      <div className="container">
        {/* Hero */}
        <motion.div
          style={{ marginBottom: 48, textAlign: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.01em' }}>
            Stories worth reading.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17 }}>
            Discover ideas, essays, and perspectives from writers who care about craft.
          </p>
        </motion.div>

        {/* Search */}
        <motion.form
          onSubmit={handleSearch}
          style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 600, margin: '0 auto 24px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <input
            name="search"
            defaultValue={search}
            placeholder="Search posts..."
            className="form-input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </motion.form>

        {/* Tag filters */}
        <motion.div
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {POPULAR_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTag(tag)}
              className="tag"
              style={activeTag === tag ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' } : {}}
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Results label */}
        {(search || activeTag) && (
          <div style={{ marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
            {search && `Results for "${search}"`}
            {activeTag && `Tagged: ${activeTag}`}
            <button
              onClick={() => { setSearch(''); setActiveTag(''); setSearchParams({}) }}
              style={{ marginLeft: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13 }}
            >
              Clear ×
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✦</div>
            <h3>No posts found</h3>
            <p>Try a different search or tag.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 40, marginTop: 24 }} />
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            Loading more...
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            ── end of feed ──
          </div>
        )}
      </div>
    </div>
  )
}