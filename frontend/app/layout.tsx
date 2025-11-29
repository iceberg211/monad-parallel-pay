import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parallel Pay | Monad 并行批量支付",
  description: "在 Monad 上创建批次支付、充值、领取的 demo 前端"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="min-h-screen">
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
