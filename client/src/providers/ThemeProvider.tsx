import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  enableSystem?: boolean
}

type ThemeProviderState = {
  theme: Theme
  actualTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  systemTheme: 'dark' | 'light'
}

const initialState: ThemeProviderState = {
  theme: 'system',
  actualTheme: 'light',
  systemTheme: 'light',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => {
      if (typeof window === 'undefined') return defaultTheme
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    }
  )
  
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('light')
  const [mounted, setMounted] = useState(false)

  // Get actual theme (resolved from 'system' if needed)
  const actualTheme = theme === 'system' ? systemTheme : theme

  // Detect system theme preference
  useEffect(() => {
    if (!enableSystem) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [enableSystem])

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement
    
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }
    
    root.classList.add(actualTheme)
  }, [actualTheme])

  // Persist theme preference
  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
    
    // Dispatch custom event for external listeners
    window.dispatchEvent(
      new CustomEvent('theme-changed', { 
        detail: { theme: newTheme, actualTheme: newTheme === 'system' ? systemTheme : newTheme } 
      })
    )
  }

  // Handle component mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeProviderContext.Provider
        {...props}
        value={{
          theme: defaultTheme,
          actualTheme: defaultTheme === 'system' ? 'light' : defaultTheme,
          systemTheme: 'light',
          setTheme: () => null,
        }}
      >
        {children}
      </ThemeProviderContext.Provider>
    )
  }

  const value: ThemeProviderState = {
    theme,
    actualTheme,
    systemTheme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}

// Hook for detecting system theme changes
export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return systemTheme
}

// Hook for theme-aware styling
export function useThemeAware() {
  const { actualTheme } = useTheme()
  
  const isDark = actualTheme === 'dark'
  const isLight = actualTheme === 'light'
  
  return {
    isDark,
    isLight,
    actualTheme,
    themeClass: actualTheme,
  }
}

// Theme toggle hook with persistence
export function useThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  const toggleTheme = () => {
    switch (theme) {
      case 'light':
        setTheme('dark')
        break
      case 'dark':
        setTheme('system')
        break
      case 'system':
        setTheme('light')
        break
      default:
        setTheme('system')
    }
  }

  const setLightTheme = () => setTheme('light')
  const setDarkTheme = () => setTheme('dark')
  const setSystemTheme = () => setTheme('system')

  return {
    theme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    setTheme,
  }
}

export type { Theme, ThemeProviderProps, ThemeProviderState }