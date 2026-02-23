"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  // Helper: fetch with auth token in Authorization header as fallback
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const currentToken = token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
    const headers = new Headers(options.headers || {})
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`)
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    })
  }, [token])

  const refreshUser = useCallback(async () => {
    try {
      const currentToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const headers: Record<string, string> = {}
      if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`
      }
      const response = await fetch("/api/auth/me", { 
        credentials: "include",
        headers,
      })
      const data = await response.json()
      if (data.user) {
        setUser(data.user)
        // If we got a user, keep the stored token
      } else if (!currentToken) {
        // Only clear user if we also don't have a token
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // On mount, try to restore token from localStorage
    const storedToken = localStorage.getItem("auth_token")
    if (storedToken) {
      setToken(storedToken)
    }
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" }
      }

      setUser(data.user)
      // Store token for Authorization header fallback
      if (data.token) {
        setToken(data.token)
        localStorage.setItem("auth_token", data.token)
      }
      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }

  const signup = async (email: string, password: string, name: string, referralCode?: string) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name, referralCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || "Signup failed" }
      }

      setUser(data.user)
      // Store token for Authorization header fallback
      if (data.token) {
        setToken(data.token)
        localStorage.setItem("auth_token", data.token)
      }
      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem("auth_token")
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, token, login, signup, logout, refreshUser, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
