import { useState, useCallback, useRef } from 'react'
import type { ToastData } from '@/components/Toast/ToastContainer'
import type { ToastType } from '@/components/Toast/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const counterRef = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}_${++counterRef.current}`
    const newToast: ToastData = { id, message, type }

    setToasts(prev => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast])

  return {
    toasts,
    removeToast,
    showToast,
    success,
    error,
    info,
    warning
  }
}
