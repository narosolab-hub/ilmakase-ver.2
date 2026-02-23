'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timerRefs.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timerRefs.current.delete(id)
    }
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => {
      // 최대 5개 유지 (오래된 것 제거)
      const next = [...prev, { id, type, message }]
      return next.length > 5 ? next.slice(next.length - 5) : next
    })
    // 3초 후 자동 닫힘
    const timer = setTimeout(() => dismiss(id), 3000)
    timerRefs.current.set(id, timer)
  }, [dismiss])

  const toast = {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    info: (message: string) => addToast('info', message),
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
