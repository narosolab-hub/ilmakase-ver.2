import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  fullWidth?: boolean
  showCount?: boolean
  maxCount?: number
}

export function Textarea({
  label,
  error,
  fullWidth = false,
  showCount = false,
  maxCount,
  value,
  className = '',
  ...props
}: TextareaProps) {
  const widthStyles = fullWidth ? 'w-full' : ''
  const currentCount = typeof value === 'string' ? value.length : 0
  
  return (
    <div className={`${widthStyles}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none ${widthStyles} ${error ? 'border-red-500' : ''} ${className}`}
        value={value}
        {...props}
      />
      <div className="flex justify-between items-center mt-1">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {showCount && (
          <p className="text-xs text-gray-400 ml-auto">
            {currentCount}{maxCount && ` / ${maxCount}`}자
          </p>
        )}
      </div>
    </div>
  )
}

