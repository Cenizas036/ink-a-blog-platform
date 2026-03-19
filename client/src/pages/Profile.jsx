import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUserPosts, updateMe } from '../api'
import useAuthStore from '../store/authStore'
import PostCard from '../components/PostCard'
import { useToast } from '../components/Toast'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'do0dfbjqs'
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'ink_uploads'

export default function Profile() {
  const { username } = useParams()
  const { user, setUser } = useAuthStore()
  const toast = useToast()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ bio: '', avatar_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const isOwn = user?.username === username

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getUserPosts(username)
        setPosts(res.data || [])
      } catch {
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username])

  useEffect(() => {
    if (user && isOwn) {
      setEditForm({ bio: user.bio || '', avatar_url: user.avatar_url || '' })
    }
  }, [user, isOwn])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', CLOUDINARY_PRESET)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST', body: fd,
      })
      const data = await res.json()
      if (data.secure_url) {
        setEditForm(f => ({ ...f, avatar_url: data.secure_url }))
        toast.success('Avatar uploaded!')
      } else throw new Error()
    } catch {
      toast.error('Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateMe(editForm)
      setUser(res.data)
      toast.success('Profile updated!')
      setEditing(false)
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const totalLikes = posts.reduce((acc, p) => acc + (p.like_count || 0), 0)
  const publishedPosts = posts.filter(p => p.published)
  const displayUser = isOwn ? user : { username, avatar_url: null }

  return (
    <div className="page">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Profile header */}
          <div style={{
            background: 'rgba(20,20,20,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '32px', marginBottom: 40,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  style={{
                    width: 90, height: 90, borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    border: '3px solid var(--accent)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(201,168,76,0.25)',
                  }}
                >
                  {displayUser?.avatar_url ? (
                    <img src={displayUser.avatar_url} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {username?.[0]}
                    </span>
                  )}
                </motion.div>
                {isOwn && editing && (
                  <label style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 13,
                  }}>
                    {uploadingAvatar ? '...' : '↑'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: 4 }}>{username}</h1>
                {user?.bio && !editing && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 480, lineHeight: 1.6 }}>{isOwn ? user.bio : ''}</p>
                )}
                <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{publishedPosts.length}</span> <span style={{ color: 'var(--text-muted)' }}>posts</span></div>
                  <div><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{totalLikes}</span> <span style={{ color: 'var(--text-muted)' }}>likes received</span></div>
                </div>
              </div>

              {isOwn && (
                <button className="btn btn-outline" onClick={() => setEditing(e => !e)} style={{ fontSize: 12 }}>
                  {editing ? 'Cancel' : 'Edit profile'}
                </button>
              )}
            </div>

            {/* Edit form */}
            {editing && isOwn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}
              >
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea
                      className="form-input"
                      value={editForm.bio}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell readers about yourself..."
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Avatar URL (or use upload button on photo)</label>
                    <input
                      className="form-input"
                      value={editForm.avatar_url}
                      onChange={e => setEditForm(f => ({ ...f, avatar_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: 12 }}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} style={{ fontSize: 12 }}>Cancel</button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>

          {/* Posts */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 24 }}>
            {isOwn ? 'Your posts' : `Posts by ${username}`}
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="card" style={{ padding: 24 }}>
                  <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, width: '50%' }} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✦</div>
              <h3>No posts yet</h3>
              {isOwn && <p><Link to="/write" style={{ color: 'var(--accent)' }}>Write your first post</Link></p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {posts.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}