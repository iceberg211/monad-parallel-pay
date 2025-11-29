import { ArrowRight, Zap, Wallet, Sparkles } from "lucide-react";
import Link from "next/link";
import { WalletConnectButton } from "@/components/wallet-connect";

const highlights = [
  {
    title: "并行友好",
    desc: "每个收款人独立 storage，天然适配 Monad 并行执行。",
    icon: <Zap className="h-5 w-5 text-mint" />
  },
  {
    title: "两步发放",
    desc: "创建批次 + 充值即可，无需多次确认转账。",
    icon: <Wallet className="h-5 w-5 text-sky" />
  },
  {
    title: "自助领取",
    desc: "收款人自己 claim，批量发放不堵塞。",
    icon: <Sparkles className="h-5 w-5 text-white" />
  }
];

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16 space-y-16">
      <div className="flex justify-end">
        <WalletConnectButton />
      </div>
      <section className="grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <div className="badge">Monad 并行批量支付</div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Parallel Pay · 一次发起，多人并行到账
          </h1>
          <p className="text-slate text-lg leading-relaxed">
            基于 PayoutManager 合约，雇主创建批次后统一充值，收款人自主 claim。
            秒级 finality + 并行执行，让工资、空投、返佣都能顺畅落地。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/employer" className="button-primary inline-flex items-center gap-2">
              我是发钱的人 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/claim" className="button-secondary">
              我要领钱
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {highlights.map((item) => (
            <div key={item.title} className="card h-full space-y-3 border border-border/60">
              <div className="flex items-center gap-3 text-sm text-slate">
                {item.icon}
                <span className="font-semibold text-white">{item.title}</span>
              </div>
              <p className="text-slate text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card space-y-4">
          <div className="badge">发起人</div>
          <h2 className="text-2xl font-semibold">创建批次 · 充值</h2>
          <p className="text-slate text-sm leading-relaxed">
            填写 token 与收款人列表，一键生成 payoutId。支持原生币或 ERC20。充值完成后，收款人可随时领取。
          </p>
          <Link href="/employer" className="button-primary inline-flex items-center gap-2 w-fit">
            前往控制台 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="card space-y-4">
          <div className="badge">收款人</div>
          <h2 className="text-2xl font-semibold">查询批次 · 自助领取</h2>
          <p className="text-slate text-sm leading-relaxed">
            输入 payoutId 查看批次详情，连接钱包后可一键 claim。并行 claim，无需等待他人完成。
          </p>
          <Link href="/claim" className="button-secondary inline-flex items-center gap-2 w-fit">
            去领取 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
