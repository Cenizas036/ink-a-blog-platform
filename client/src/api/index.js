import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ink_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Unwrap data envelope
api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data?.error || err)
)

// ── Auth ──
export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const updateMe = (data) => api.patch('/auth/me', data)

// ── Posts ──
export const getFeed = (params) => api.get('/posts', { params })
export const getPost = (slug) => api.get(`/posts/${slug}`)
export const getUserPosts = (username) => api.get(`/posts/user/${username}`)
export const createPost = (data) => api.post('/posts', data)
export const updatePost = (id, data) => api.put(`/posts/${id}`, data)
export const deletePost = (id) => api.delete(`/posts/${id}`)
export const toggleLike = (id) => api.post(`/posts/${id}/like`)

// ── Comments ──
export const getComments = (postId) => api.get(`/comments/${postId}`)
export const addComment = (postId, data) => api.post(`/comments/${postId}`, data)
export const deleteComment = (id) => api.delete(`/comments/${id}`)

export default api