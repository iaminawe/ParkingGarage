import { useState, useCallback } from 'react'

type ToastType = 'default' | 'destructive' | 'success'

interface Toast {
  id: string
  title?: string
  description?: string
  type: ToastType
  duration?: number
}

interface ToastOptions {
  title?: string
  description?: string
  type?: ToastType
  duration?: number
}

// Simple toast implementation
export const toast = (options: ToastOptions | string) => {
  const toastOptions: ToastOptions = typeof options === 'string' 
    ? { description: options } 
    : options

  // For now, just use console.log as a simple implementation
  // In a real app, this would integrate with a toast library
  console.log(`Toast: ${toastOptions.title || ''} - ${toastOptions.description || ''}`)
  
  // You could also use window.alert for immediate feedback during development
  if (toastOptions.type === 'destructive') {
    console.error(`Error: ${toastOptions.description}`)
  } else {
    console.info(`Info: ${toastOptions.description}`)
  }
}

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((options: ToastOptions) => {
    const id = Date.now().toString()
    const newToast: Toast = {
      id,
      type: 'default',
      duration: 5000,
      ...options
    }
    setToasts(prev => [...prev, newToast])

    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, newToast.duration)

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    toast: addToast,
    dismiss: removeToast
  }
}