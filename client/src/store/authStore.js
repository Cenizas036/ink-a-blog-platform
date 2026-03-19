import { create } from 'zustand'
import { login as apiLogin, register as apiRegister, getMe } from '../api'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('ink_token'),
  loading: true,

  init: async () => {
    const token = localStorage.getItem('ink_token')
    if (!token) return set({ loading: false })
    try {
      const res = await getMe()
      set({ user: res.data, loading: false })
    } catch {
      localStorage.removeItem('ink_token')
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (credentials) => {
    const res = await apiLogin(credentials)
    localStorage.setItem('ink_token', res.data.token)
    set({ user: res.data.user, token: res.data.token })
  },

  register: async (data) => {
    const res = await apiRegister(data)
    localStorage.setItem('ink_token', res.data.token)
    set({ user: res.data.user, token: res.data.token })
  },

  logout: () => {
    localStorage.removeItem('ink_token')
    set({ user: null, token: null })
  },

  setUser: (user) => set({ user }),
}))

export default useAuthStore