import React, { createContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'
import type { User, AuthContextType } from '@/types/auth'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('parking-garage-user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('parking-garage-user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true)
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8742/api'}/auth/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      )

      if (response.data.success) {
        const { user, token } = response.data.data
        
        // Store token for API requests
        localStorage.setItem('auth_token', token)
        
        // Format user data to match client interface
        const userData: User = {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
          role: user.role as User['role']
        }
        
        setUser(userData)
        localStorage.setItem('parking-garage-user', JSON.stringify(userData))
      } else {
        throw new Error(response.data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      
      // If real API fails, fall back to demo mode for development
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔄 Falling back to demo mode - API login failed')
        
        // Generate demo user based on email
        const name = email.split('@')[0].replace(/[._]/g, ' ')
        const formattedName = name.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        let role: User['role'] = 'customer'
        if (email.includes('admin') || email === 'admin@example.com') {
          role = 'admin'
        } else if (email.includes('operator') || email.includes('manager')) {
          role = 'operator'
        }

        const userData: User = {
          id: 'demo-' + Math.random().toString(36).substr(2, 9),
          email,
          name: formattedName,
          role,
        }
        
        // Generate a demo token
        const demoToken = 'demo-token-' + btoa(email) + '-' + Date.now()
        localStorage.setItem('auth_token', demoToken)
        
        setUser(userData)
        localStorage.setItem('parking-garage-user', JSON.stringify(userData))
      } else {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token && !token.startsWith('demo-token-')) {
        // Call real logout API if we have a real token
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8742/api'}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // Continue with local logout even if API call fails
    } finally {
      setUser(null)
      localStorage.removeItem('parking-garage-user')
      localStorage.removeItem('auth_token')
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}