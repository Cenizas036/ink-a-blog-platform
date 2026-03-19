import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { createPost, updatePost, getUserPosts } from '../api'
import useAuthStore from '../store/authStore'
import { useToast } from '../components/Toast'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

export default function Write() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const toast = useToast()

  const [tab, setTab] = useState('write')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [published, setPublished] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [postId, setPostId] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    if (editId) loadPost(editId)
  }, [user, editId])

  const loadPost = async (id) => {
    try {
      const res = await getUserPosts(user.username)
      const post = res.data.find(p => p.id === parseInt(id))
      if (!post) { toast.error('Post not found'); navigate('/'); return }
      setTitle(post.title)
      setBody(post.body)
      setTags(post.tags?.join(', ') || '')
      setCoverImage(post.cover_image || '')
      setPublished(post.published)
      setPostId(post.id)
    } catch {
      toast.error('Failed to load post')
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
      toast.error('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD and VITE_CLOUDINARY_PRESET in .env')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', CLOUDINARY_PRESET)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST', body: fd,
      })
      const data = await res.json()
      if (data.secure_url) {
        setCoverImage(data.secure_url)
        toast.success('Image uploaded!')
      } else {
        throw new Error('Upload failed')
      }
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) { toast.error('Title and body required'); return }
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        cover_image: coverImage.trim() || null,
        published,
      }
      let res
      if (postId) {
        res = await updatePost(postId, payload)
        toast.success('Post updated!')
      } else {
        res = await createPost(payload)
        toast.success('Post published!')
      }
      navigate(`/post/${res.data.slug}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to save post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}>
              {postId ? 'Edit Post' : 'New Post'}
            </h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPublished(true)} className={`btn ${published ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: 12 }}>Publish</button>
              <button onClick={() => setPublished(false)} className={`btn ${!published ? 'btn-outline' : 'btn-ghost'}`} style={{ fontSize: 12 }}>Draft</button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Your post title..."
                style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}
              />
            </div>

            {/* Tags */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Tags (comma separated)</label>
              <input
                className="form-input"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="technology, design, writing"
              />
            </div>

            {/* Cover image */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Cover Image</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="https://... or upload below"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn btn-outline" style={{ fontSize: 12 }}>
                    {uploading ? 'Uploading...' : '↑ Upload image'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                </label>
                {coverImage && (
                  <img src={coverImage} alt="cover preview" style={{ height: 48, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border)' }} />
                )}
              </div>
            </div>

            {/* Editor tabs */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
              {['write', 'preview'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    padding: '8px 20px',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                    color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    marginBottom: -1,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'write' ? (
              <textarea
                className="form-input"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write in markdown..."
                style={{ minHeight: 400, fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.8 }}
              />
            ) : (
              <div style={{ minHeight: 400, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
                {body ? (
                  <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing to preview yet.</p>
                )}
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : postId ? 'Update post' : 'Publish post'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}