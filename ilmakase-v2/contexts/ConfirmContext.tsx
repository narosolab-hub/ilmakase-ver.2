'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/UI'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type ResolverFn = (value: boolean) => void

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<ResolverFn | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
      setOptions(opts)
    })
  }, [])

  const handleResolve = (value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          onKeyDown={e => e.key === 'Escape' && handleResolve(false)}
        >
          {/* 배경 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => handleResolve(false)}
          />
          {/* 모달 */}
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full fade-in">
            {options.title && (
              <h3 className="text-base font-bold text-gray-900 mb-2">{options.title}</h3>
            )}
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {options.message}
            </p>
            <div className="flex gap-2 justify-end mt-5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleResolve(false)}
              >
                {options.cancelLabel ?? '취소'}
              </Button>
              <Button
                variant={options.variant === 'danger' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleResolve(true)}
              >
                {options.confirmLabel ?? '확인'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
