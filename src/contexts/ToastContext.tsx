import { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react'
import { ToastContainer } from '@/components/Toast/ToastContainer'
import type { ToastData } from '@/components/Toast/ToastContainer'
import type { ToastType } from '@/components/Toast/Toast'

interface ToastContextValue {
  success: (msg: string) => void
  error:   (msg: string) => void
  info:    (msg: string) => void
  warning: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const counter = useRef(0)

  const show = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}_${++counter.current}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{
      success: msg => show(msg, 'success'),
      error:   msg => show(msg, 'error'),
      info:    msg => show(msg, 'info'),
      warning: msg => show(msg, 'warning'),
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useGlobalToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useGlobalToast must be used within ToastProvider')
  return ctx
}
