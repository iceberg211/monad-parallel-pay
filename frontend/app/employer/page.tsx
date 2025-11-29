"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ListPlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Address, isAddress, parseEther, zeroAddress } from "viem";
import Link from "next/link";
import { PAYOUT_MANAGER_ADDRESS, payoutManagerAbi } from "@/config/contract";
import { formatAmount } from "@/lib/format";
import { WalletConnectButton } from "@/components/wallet-connect";

interface RecipientRow {
  address: string;
  amount: string;
}

const sampleRecipients: RecipientRow[] = [
  { address: "0x6B5bC9e7c7f49b1a20F49a0f2D1D8A98B6f0b0a1", amount: "0.25" },
  { address: "0x8E1B5C00d0e22bB6E5b93261c4d3Edc4bB5f3e4C", amount: "0.40" },
  { address: "0x1F9fD73C5b59b4a62f7D4d3B1A6F1c0F23d7a1c2", amount: "0.35" },
];

export default function EmployerPage() {
  const { isConnected } = useAccount();
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [recipients, setRecipients] = useState<RecipientRow[]>([
    {
      address: "",
      amount: "",
    },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundPayoutId, setFundPayoutId] = useState<string>("");
  const [fundAmount, setFundAmount] = useState<string>("");
  const [createdPayoutId, setCreatedPayoutId] = useState<bigint | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const { data: nextPayoutId, refetch: refetchNextId } = useReadContract({
    address: PAYOUT_MANAGER_ADDRESS,
    abi: payoutManagerAbi,
    functionName: "nextPayoutId",
    query: {
      refetchInterval: 15_000,
    },
  });

  const { data: payoutInfo, refetch: refetchPayout } = useReadContract({
    address: PAYOUT_MANAGER_ADDRESS,
    abi: payoutManagerAbi,
    functionName: "payouts",
    args: [fundPayoutId ? BigInt(fundPayoutId) : 0n],
    query: {
      enabled: Boolean(fundPayoutId),
    },
  });

  const createWrite = useWriteContract();
  const fundWrite = useWriteContract();
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

  const { isLoading: creatingOnChain, isSuccess: createConfirmed } =
    useWaitForTransactionReceipt({
      hash: createWrite.data,
      query: {
        enabled: Boolean(createWrite.data),
        refetchInterval: 2_000,
      },
    });

  const { isLoading: fundingOnChain, isSuccess: fundConfirmed } =
    useWaitForTransactionReceipt({
      hash: fundWrite.data,
      query: {
        enabled: Boolean(fundWrite.data),
        refetchInterval: 2_000,
      },
    });

  const handleRecipientChange = (
    index: number,
    field: keyof RecipientRow,
    value: string
  ) => {
    setRecipients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addRecipient = () =>
    setRecipients((prev) => [...prev, { address: "", amount: "" }]);

  const removeRecipient = (index: number) => {
    setRecipients((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const fillSamples = () => setRecipients(sampleRecipients);

  const openImportModal = () => {
    setImportError(null);
    setImportText("");
    setIsImportOpen(true);
  };

  const closeImportModal = () => setIsImportOpen(false);

  const handleImportConfirm = () => {
    setImportError(null);
    const matches = importText.match(/0x[a-fA-F0-9]{40}/g) ?? [];
    const validAddresses = matches.filter((addr) =>
      isAddress(addr)
    ) as string[];

    if (!validAddresses.length) {
      setImportError("未找到有效地址，请检查粘贴内容");
      return;
    }

    setRecipients((prev) =>
      validAddresses.map((addr, idx) => ({
        address: addr,
        amount: prev[idx]?.amount ?? "",
      }))
    );
    setIsImportOpen(false);
  };

  const handleCreate = async () => {
    setCreateError(null);
    try {
      const validRows = recipients.filter((r) => r.address && r.amount);
      if (!validRows.length) throw new Error("请至少填写一位收款人和金额");

      const invalid = validRows.find((r) => !isAddress(r.address));
      if (invalid) throw new Error("存在无效地址，检查填写");

      const token = tokenAddress ? (tokenAddress as Address) : zeroAddress;
      if (tokenAddress && !isAddress(tokenAddress))
        throw new Error("Token 地址格式不正确");

      const amounts = validRows.map((r) => {
        if (Number(r.amount) <= 0) throw new Error("金额需大于 0");
        return parseEther(r.amount);
      });

      const recipientAddresses = validRows.map((r) => r.address as Address);
      const expectedId = typeof nextPayoutId === "bigint" ? nextPayoutId : null;

      const hash = await createWrite.writeContractAsync({
        address: PAYOUT_MANAGER_ADDRESS,
        abi: payoutManagerAbi,
        functionName: "createPayout",
        args: [token, recipientAddresses, amounts, "", 0],
        // 部分 RPC 估算可能失败，提供 gas 兜底
        gas: 800_000n,
      });

      setCreatedPayoutId(expectedId);

      await refetchNextId();
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      setCreateError(message);
    }
  };

  const isNativeToken = useMemo(
    () => payout?.token === zeroAddress,
    [payout?.token]
  );
  const needAmount = useMemo(() => {
    if (!payout) return null;
    const diff = payout.totalAmount - payout.fundedAmount;
    return diff > 0n ? diff : 0n;
  }, [payout]);

  const handleFund = async () => {
    setFundError(null);
    try {
      if (!fundPayoutId) throw new Error("请先输入 payoutId");
      const amountWei = parseEther(fundAmount || "0");
      if (amountWei <= 0n) throw new Error("充值金额需大于 0");
      const payoutIdBig = BigInt(fundPayoutId);

      const hash = await fundWrite.writeContractAsync({
        address: PAYOUT_MANAGER_ADDRESS,
        abi: payoutManagerAbi,
        functionName: "fundPayout",
        args: [payoutIdBig, amountWei],
        value: isNativeToken ? amountWei : 0n,
      });

      await refetchPayout();
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : "充值失败";
      setFundError(message);
    }
  };

  return (
    <>
      {isImportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="card max-w-2xl w-full space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="badge">快速导入</div>
                <h3 className="text-xl font-semibold mt-2">粘贴地址列表</h3>
                <p className="text-sm text-slate mt-1">
                  系统将自动识别文本中的钱包地址，忽略无关字符。
                </p>
              </div>
              <button className="button-secondary" onClick={closeImportModal}>
                关闭
              </button>
            </div>
            <label className="space-y-2 block">
              <span className="text-sm text-slate">在此粘贴</span>
              <textarea
                className="input-base min-h-[220px] resize-vertical"
                placeholder="请粘贴包含地址的文本..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </label>
            {importError ? (
              <div className="text-xs text-rose-300">{importError}</div>
            ) : null}
            <div className="flex items-center gap-3 justify-end">
              <button className="button-secondary" onClick={closeImportModal}>
                取消
              </button>
              <button
                className="button-primary inline-flex items-center gap-2"
                onClick={handleImportConfirm}
              >
                <ListPlus className="h-4 w-4" /> 确认导入
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="button-secondary inline-flex items-center gap-2"
            href="/"
          >
            返回首页
          </Link>
          <WalletConnectButton />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="badge">薪酬管理台</div>
            <h1 className="text-3xl font-semibold mt-2">新建支付计划</h1>
            <p className="text-slate text-sm mt-2">
              只需两步：1. 创建支付清单；2. 存入资金。随后员工即可自助领取。
            </p>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">第一步：创建支付清单</h2>
            <button
              className="button-secondary inline-flex items-center gap-2"
              onClick={fillSamples}
            >
              <Sparkles className="h-4 w-4" /> 加载演示数据
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate">
                支付币种（留空默认为 MON）
              </span>
              <input
                className="input-base"
                placeholder="0x... 或留空"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value.trim())}
              />
            </label>
            <div className="space-y-2">
              <span className="text-sm text-slate">预计清单编号</span>
              <div className="glass-panel px-3 py-2 rounded-xl text-sm text-white">
                {typeof nextPayoutId === "bigint"
                  ? nextPayoutId.toString()
                  : "加载中..."}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate">
                收款人名单（金额单位：MON/Token）
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="button-secondary inline-flex items-center gap-2"
                  onClick={openImportModal}
                >
                  <ListPlus className="h-4 w-4" /> 批量粘贴地址
                </button>
                <button
                  className="button-secondary inline-flex items-center gap-2"
                  onClick={addRecipient}
                >
                  <Plus className="h-4 w-4" /> 添加收款人
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {recipients.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto] items-center"
                >
                  <input
                    className="input-base"
                    placeholder="钱包地址"
                    value={row.address}
                    onChange={(e) =>
                      handleRecipientChange(idx, "address", e.target.value)
                    }
                  />
                  <input
                    className="input-base"
                    placeholder="支付金额"
                    value={row.amount}
                    onChange={(e) =>
                      handleRecipientChange(idx, "amount", e.target.value)
                    }
                  />
                  <button
                    className="button-secondary inline-flex items-center gap-2"
                    onClick={() => removeRecipient(idx)}
                    disabled={recipients.length === 1}
                  >
                    <Trash2 className="h-4 w-4" /> 删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="button-primary inline-flex items-center gap-2"
              onClick={handleCreate}
              disabled={
                !isConnected || createWrite.isPending || creatingOnChain
              }
            >
              {createWrite.isPending || creatingOnChain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 创建中
                </>
              ) : (
                <>
                  确认创建清单 <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {!isConnected && (
              <span className="text-xs text-rose-300">请先连接钱包</span>
            )}
            {createError ? (
              <span className="text-xs text-rose-300">{createError}</span>
            ) : null}
            {createConfirmed && createdPayoutId !== null ? (
              <span className="text-xs text-mint">
                清单创建成功！编号：{createdPayoutId.toString()}
              </span>
            ) : null}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="section-title">第二步：存入资金</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-slate">清单编号</span>
              <input
                className="input-base"
                placeholder="请输入刚才创建的编号"
                value={fundPayoutId}
                onChange={(e) => setFundPayoutId(e.target.value.trim())}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate">
                存入总额
              </span>
              <input
                className="input-base"
                placeholder="例如 1.5"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
            </label>
            <div className="space-y-2">
              <span className="text-sm text-slate">币种类型</span>
              <div className="glass-panel px-3 py-2 rounded-xl text-sm text-white">
                {payout
                  ? payout.token === zeroAddress
                    ? "原生币 (MON)"
                    : payout.token
                  : "输入编号以加载"}
              </div>
            </div>
          </div>

          {payout ? (
            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <Stat label="创建人" value={payout.creator} compact />
              <Stat
                label="应付总额"
                value={`${formatAmount(payout.totalAmount)}`}
              />
              <Stat
                label="已存金额"
                value={`${formatAmount(payout.fundedAmount)}`}
              />
              <Stat
                label="状态"
                value={payout.closed ? "已关闭" : "开放中"}
              />
            </div>
          ) : null}

          {needAmount !== null && payout ? (
            <div className="text-xs text-slate">
              建议存入：{formatAmount(needAmount)} （剩余缺口）
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              className="button-primary inline-flex items-center gap-2"
              onClick={handleFund}
              disabled={!isConnected || fundWrite.isPending || fundingOnChain}
            >
              {fundWrite.isPending || fundingOnChain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 存入中
                </>
              ) : (
                <>
                  确认存入 <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {!isConnected && (
              <span className="text-xs text-rose-300">请先连接钱包</span>
            )}
            {fundError ? (
              <span className="text-xs text-rose-300">{fundError}</span>
            ) : null}
            {fundConfirmed ? (
              <span className="text-xs text-mint">资金存入成功</span>
            ) : null}
          </div>
        </div>

        <div className="text-sm text-slate">
          <p>
            提示：默认金额单位为 18 位精度（标准 ERC20）。请确保您的钱包网络与合约所在网络一致。
          </p>
          <p className="mt-2">
            分发指南：将「清单编号」发送给收款人，他们即可在{" "}
            <Link className="underline" href="/claim">
              领取页面
            </Link>{" "}
            自助提现。
          </p>
        </div>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="glass-panel rounded-xl p-3 border border-border/60">
      <div className="text-xs text-slate mb-1">{label}</div>
      <div className={`font-semibold ${compact ? "text-xs" : "text-sm"} break-all`}>{value}</div>
    </div>
  );
}
