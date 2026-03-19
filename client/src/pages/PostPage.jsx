import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { getPost, toggleLike, getComments, addComment, deleteComment, deletePost } from '../api'
import useAuthStore from '../store/authStore'
import { useToast } from '../components/Toast'

export default function PostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToast()

  const [post, setPost] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState([])
  const [commentBody, setCommentBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPost(slug)
        setPost(res.data)
        setLiked(res.data.user_liked || false)
        setLikeCount(res.data.like_count || 0)

        const cRes = await getComments(res.data.id)
        setComments(cRes.data || [])
      } catch {
        toast.error('Post not found')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const handleLike = async () => {
    if (!user) { toast.info('Sign in to like posts'); return }
    const optimisticLiked = !liked
    setLiked(optimisticLiked)
    setLikeCount(c => optimisticLiked ? c + 1 : c - 1)
    try {
      const res = await toggleLike(post.id)
      setLiked(res.data.liked)
      setLikeCount(res.data.like_count)
    } catch {
      setLiked(!optimisticLiked)
      setLikeCount(c => optimisticLiked ? c - 1 : c + 1)
      toast.error('Failed to update like')
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setSubmitting(true)
    try {
      const res = await addComment(post.id, { body: commentBody })
      setComments(prev => [res.data, ...prev])
      setCommentBody('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (id) => {
    try {
      await deleteComment(id)
      setComments(prev => prev.filter(c => c.id !== id))
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post permanently?')) return
    try {
      await deletePost(post.id)
      toast.success('Post deleted')
      navigate('/')
    } catch {
      toast.error('Failed to delete post')
    }
  }

  if (loading) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="skeleton" style={{ height: 40, width: '70%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 48 }} />
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 16, marginBottom: 12 }} />
        ))}
      </div>
    </div>
  )

  if (!post) return null

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })
  const isAuthor = user?.id === post.author_id

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Tags */}
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {post.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
            {post.title}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to={`/profile/${post.author_username}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {post.author_username?.[0]}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>{post.author_username}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{date} · {post.read_time || 1} min read</div>
                </div>
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAuthor && (
                <>
                  <Link to={`/write?edit=${post.id}`} className="btn btn-outline" style={{ fontSize: 12 }}>Edit</Link>
                  <button onClick={handleDeletePost} className="btn btn-danger" style={{ fontSize: 12 }}>Delete</button>
                </>
              )}
            </div>
          </div>

          {/* Cover image */}
          {post.cover_image && (
            <img src={post.cover_image} alt={post.title} style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginBottom: 32, maxHeight: 400, objectFit: 'cover' }} />
          )}

          {/* Body */}
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>

          {/* Like */}
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.9 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: liked ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${liked ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: liked ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              ♥ {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </motion.button>
          </div>

          {/* Comments */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 24 }}>
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </h3>

            {user && (
              <form onSubmit={handleComment} style={{ marginBottom: 32 }}>
                <textarea
                  className="form-input"
                  placeholder="Share your thoughts..."
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  rows={3}
                  style={{ marginBottom: 12 }}
                />
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post comment'}
                </button>
              </form>
            )}

            {!user && (
              <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to join the conversation.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.map(c => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
                      {c.author_username}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {(user?.id === c.author_id || isAuthor) && (
                      <button onClick={() => handleDeleteComment(c.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Delete</button>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.article>
      </div>
    </div>
  )
}