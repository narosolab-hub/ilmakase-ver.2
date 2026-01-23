import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "일마카세 v2 - 업무 기록이 경력기술서가 되는 곳",
  description: "메모장처럼 쓴 업무 기록이 이직용 경력기술서로 자동 변환됩니다",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
