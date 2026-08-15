import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = axios.create({ baseURL: '/api' })

// Attach JWT token to all requests
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cf_token')
    const userData = localStorage.getItem('cf_user')
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await API.post('/auth/login', { username, password })
    const { access_token, user: u } = res.data
    localStorage.setItem('cf_token', access_token)
    localStorage.setItem('cf_user', JSON.stringify(u))
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.removeItem('cf_token')
    localStorage.removeItem('cf_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, API }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export { API }
