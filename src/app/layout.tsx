import type { Metadata } from "next";
import { Gothic_A1, Inter } from "next/font/google";
import { MswProvider } from "@/mocks/msw-provider";
import { Providers } from "@/app/providers";
import "./globals.css";

// 피그마 v6 지정 서체: 라틴은 Inter, 한글은 Gothic A1
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const gothicA1 = Gothic_A1({
  variable: "--font-gothic-a1",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "굿퀘스천",
  description: "이야기로 말하기와 문해력을 키우는 AI 학습 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${gothicA1.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MswProvider>
          <Providers>{children}</Providers>
        </MswProvider>
      </body>
    </html>
  );
}
