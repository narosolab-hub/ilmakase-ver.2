import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "일마카세 아카이브 - 오늘 한 일이 내일의 포트폴리오가 됩니다",
  description: "매일의 업무 기록을 AI가 자동으로 포트폴리오로 변환해주는 서비스",
  keywords: ["포트폴리오", "업무 기록", "AI", "커리어", "이직", "취업"],
  authors: [{ name: "일마카세 아카이브" }],
  openGraph: {
    title: "일마카세 아카이브",
    description: "오늘 한 일이 내일의 포트폴리오가 됩니다",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <div className="mobile-frame">
          {children}
        </div>
      </body>
    </html>
  );
}
