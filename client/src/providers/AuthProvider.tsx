import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, AuthContextType } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

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
      } catch (error) {
        localStorage.removeItem('parking-garage-user')
      }
    }
    setLoading(false)
  }, [])

  const generateMockUser = (email: string): User => {
    const name = email.split('@')[0].replace(/[._]/g, ' ')
    const formattedName = name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Map seeded users to appropriate roles
    let role: User['role'] = 'customer'
    if (email.includes('admin') || email === 'user1@example.com') {
      role = 'admin'
    } else if (email.includes('operator') || email.includes('manager') || 
               email === 'user2@example.com' || email === 'user3@example.com') {
      role = 'operator'
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: formattedName,
      role,
    }
  }

  const login = async (email: string, _password: string): Promise<void> => {
    setLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      // Demo: Accept any email/password combination
      const userData = generateMockUser(email)
      setUser(userData)
      localStorage.setItem('parking-garage-user', JSON.stringify(userData))
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('parking-garage-user')
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