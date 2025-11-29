/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowRight, Zap, Wallet, Sparkles, Users, PieChart, Calendar } from "lucide-react";
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

const scenarios = [
  {
    title: "工资 / 定期发放",
    desc: "适合每月发放工资、奖金或补贴。支持保存模版，一键生成新批次。",
    icon: <Users className="h-6 w-6 text-mint" />,
    href: "/employer?mode=payroll",
    color: "text-mint"
  },
  {
    title: "按比例分账",
    desc: "适合创作者收益、广告分成或众筹分红。输入总额与比例，自动计算分账。",
    icon: <PieChart className="h-6 w-6 text-sky" />,
    href: "/employer?mode=split",
    color: "text-sky"
  },
  {
    title: "活动 / 门票奖励",
    desc: "适合 Hackathon、线下活动奖励分发。批量导入地址，统一金额发放。",
    icon: <Calendar className="h-6 w-6 text-amber-400" />,
    href: "/employer?mode=event",
    color: "text-amber-400"
  }
];

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16 space-y-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-mint to-sky rounded-lg flex items-center justify-center shadow-lg shadow-mint/20">
            <Zap className="text-black h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Parallel Pay</span>
        </div>
        <WalletConnectButton />
      </div>

      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="badge mx-auto">Monad Parallel Pay</div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          下一代 <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint to-sky">并行支付</span> 协议
        </h1>
        <p className="text-slate text-lg leading-relaxed">
          基于 Monad 高性能并行执行环境。无论是发工资、分广告费还是发活动奖励，
          只需一次操作，即可并行分发给成千上万个接收者。
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/employer" className="button-primary px-8 py-3 text-lg">
            立即开始
          </Link>
          <Link href="/claim" className="button-secondary px-8 py-3 text-lg">
            领取资金
          </Link>
        </div>
      </section>

      {/* Scenarios Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">选择你的使用场景</h2>
          <p className="text-slate">针对不同业务需求，提供定制化的分发方案</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {scenarios.map((item) => (
            <Link
              key={item.title}
              href={item.href as any}
              className="card group hover:border-mint/50 transition-colors duration-300"
            >
              <div className={`p-3 rounded-xl bg-white/5 w-fit mb-4 ${item.color}`}>
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-mint transition-colors">
                {item.title}
              </h3>
              <p className="text-slate text-sm leading-relaxed">
                {item.desc}
              </p>
              <div className="mt-4 flex items-center text-sm font-medium text-slate group-hover:text-white transition-colors">
                去创建 <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid gap-4 md:grid-cols-3 pt-8 border-t border-white/10">
        {highlights.map((item) => (
          <div key={item.title} className="p-6 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate">
              {item.icon}
              <span className="font-semibold text-white">{item.title}</span>
            </div>
            <p className="text-slate text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
