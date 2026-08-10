import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MswProvider } from "@/mocks/msw-provider";
import { Providers } from "@/app/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MswProvider>
          <Providers>{children}</Providers>
        </MswProvider>
      </body>
    </html>
  );
}
