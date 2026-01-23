import React from 'react'

interface ProgressBarProps {
  current: number
  total: number
  className?: string
}

export function ProgressBar({ current, total, className = '' }: ProgressBarProps) {
  const percentage = (current / total) * 100
  
  return (
    <div className={`h-1.5 w-full bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

