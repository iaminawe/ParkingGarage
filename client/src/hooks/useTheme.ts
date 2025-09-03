import { useContext, useState, useEffect } from 'react'
import { ThemeProviderContext } from '@/providers/ThemeProvider'

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
