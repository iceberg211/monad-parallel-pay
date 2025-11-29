"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { zeroAddress } from "viem";
import { PAYOUT_MANAGER_ADDRESS, payoutManagerAbi } from "@/config/contract";
import { formatAmount, formatToken, truncateAddress } from "@/lib/format";
import { WalletConnectButton } from "@/components/wallet-connect";

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [payoutIdInput, setPayoutIdInput] = useState<string>("");
  const [currentId, setCurrentId] = useState<bigint | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: payoutInfo, refetch: refetchPayout } = useReadContract({
    address: PAYOUT_MANAGER_ADDRESS,
    abi: payoutManagerAbi,
    functionName: "payouts",
    args: [currentId ?? 0n],
    query: {
      enabled: currentId !== null,
    },
  });

  const { data: claimableAmount, refetch: refetchClaimable } = useReadContract({
    address: PAYOUT_MANAGER_ADDRESS,
    abi: payoutManagerAbi,
    functionName: "claimable",
    args: [currentId ?? 0n, address ?? zeroAddress],
    query: {
      enabled: currentId !== null && Boolean(address),
    },
  });

  const writeClaim = useWriteContract();
  const { isLoading: claiming, isSuccess: claimConfirmed } =
    useWaitForTransactionReceipt({
      hash: writeClaim.data,
      query: {
        enabled: Boolean(writeClaim.data),
      },
    });

  const payout = useMemo(() => {
    if (!payoutInfo || !Array.isArray(payoutInfo)) return null;
    const [
      creator,
      token,
      totalAmount,
      fundedAmount,
      closed,
      title,
      payoutType,
    ] = payoutInfo as unknown as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      boolean,
      string,
      number
    ];
    return {
      creator,
      token,
      totalAmount,
      fundedAmount,
      closed,
      title,
      payoutType,
    };
  }, [payoutInfo]);

  useEffect(() => {
    if (claimConfirmed) {
      refetchClaimable();
      refetchPayout();
      setMessage("领取成功，余额已更新");
    }
  }, [claimConfirmed, refetchClaimable, refetchPayout]);

  const handleLoad = () => {
    setError(null);
    setMessage(null);
    if (!payoutIdInput) {
      setError("请输入 payoutId");
      return;
    }
    try {
      const parsed = BigInt(payoutIdInput);
      setCurrentId(parsed);
    } catch {
      setError("payoutId 需要是数字");
    }
  };

  const handleClaim = async () => {
    setError(null);
    setMessage(null);
    if (!isConnected) {
      setError("请先连接钱包");
      return;
    }
    if (currentId === null) {
      setError("请先查询 payoutId");
      return;
    }
    try {
      await writeClaim.writeContractAsync({
        address: PAYOUT_MANAGER_ADDRESS,
        abi: payoutManagerAbi,
        functionName: "claim",
        args: [currentId],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "领取失败";
      setError(msg);
    }
  };

  const canClaim = useMemo(() => {
    return typeof claimableAmount === "bigint" && claimableAmount > 0n;
  }, [claimableAmount]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          className="button-secondary inline-flex items-center gap-2"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" /> 返回首页
        </Link>
        <WalletConnectButton />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="badge">员工自助领取</div>
          <h1 className="text-3xl font-semibold mt-2">
            输入清单编号，一键领取工资
          </h1>
          <p className="text-slate text-sm mt-2">
            系统支持万人同时领取，资金秒级到账。
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="grid gap-3 md:grid-cols-[2fr_auto] items-end">
          <label className="space-y-2">
            <span className="text-sm text-slate">清单编号</span>
            <input
              className="input-base"
              placeholder="请输入雇主提供的编号"
              value={payoutIdInput}
              onChange={(e) => setPayoutIdInput(e.target.value.trim())}
            />
          </label>
          <div className="flex gap-3">
            <button className="button-secondary" onClick={handleLoad}>
              查询
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                refetchPayout();
                refetchClaimable();
              }}
            >
              <RefreshCw className="h-4 w-4" /> 刷新
            </button>
          </div>
        </div>
        {currentId !== null ? (
          <p className="text-xs text-slate">
            当前编号：{currentId.toString()}
          </p>
        ) : null}
      </div>

      {payout ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="badge">清单详情</div>
            {payout.closed ? (
              <span className="badge border-rose-400/60 text-rose-200">
                已关闭
              </span>
            ) : (
              <span className="badge border-mint/50 text-mint">开放中</span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <Info label="币种" value={formatToken(payout.token)} />
            <Info label="创建人" value={truncateAddress(payout.creator)} />
            <Info
              label="清单总额"
              value={`${formatAmount(payout.totalAmount)}`}
            />
            <Info
              label="资金池余额"
              value={`${formatAmount(payout.fundedAmount)}`}
            />
          </div>
        </div>
      ) : currentId !== null ? (
        <div className="text-sm text-slate">加载批次信息中...</div>
      ) : null}

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title mb-0">待领取金额</h3>
          {isConnected && address ? (
            <span className="badge">{truncateAddress(address)}</span>
          ) : null}
        </div>
        <div className="text-2xl font-semibold">
          {typeof claimableAmount === "bigint"
            ? `${formatAmount(claimableAmount)}`
            : "-"}
        </div>
        <p className="text-xs text-slate">
          金额单位：MON/Token
        </p>
        <div className="flex items-center gap-3">
          <button
            className="button-primary inline-flex items-center gap-2"
            onClick={handleClaim}
            disabled={!canClaim || claiming || !isConnected}
          >
            {claiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 领取中
              </>
            ) : (
              <>
                确认领取 <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          {!canClaim && (
            <span className="text-xs text-slate">暂无可领资金</span>
          )}
        </div>
        {message ? <div className="text-xs text-mint">{message}</div> : null}
        {error ? <div className="text-xs text-rose-300">{error}</div> : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-xl p-3 border border-border/60">
      <div className="text-xs text-slate mb-1">{label}</div>
      <div className="text-sm font-semibold break-words break-all">{value}</div>
    </div>
  );
}
