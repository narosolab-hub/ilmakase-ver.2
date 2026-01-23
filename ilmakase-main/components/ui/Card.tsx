import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  style?: React.CSSProperties
}

export function Card({ children, className = '', onClick, hoverable = false, style }: CardProps) {
  const hoverStyles = hoverable ? 'hover:shadow-md hover:scale-[1.01] cursor-pointer' : ''
  
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition ${hoverStyles} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}

