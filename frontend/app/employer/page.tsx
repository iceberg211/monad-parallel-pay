"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ListPlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Users,
  PieChart,
  Calendar,
  Save,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { Address, isAddress, parseEther, zeroAddress } from "viem";
import Link from "next/link";
import { PAYOUT_MANAGER_ADDRESS, payoutManagerAbi, erc20Abi } from "@/config/contract";
import { formatAmount } from "@/lib/format";
import { WalletConnectButton } from "@/components/wallet-connect";

interface RecipientRow {
  address: string;
  amount: string;
  ratio?: string; // For split mode
}

type SceneMode = "payroll" | "split" | "event";

const sceneConfig = {
  payroll: {
    title: "工资 / 定期发放",
    desc: "适合每月发放工资、奖金或补贴",
    icon: Users,
    color: "text-mint",
    payoutType: 1,
    samples: [
      { address: "0x6B5bC9e7c7f49b1a20F49a0f2D1D8A98B6f0b0a1", amount: "1000" },
      { address: "0x8E1B5C00d0e22bB6E5b93261c4d3Edc4bB5f3e4C", amount: "1200" },
      { address: "0x1F9fD73C5b59b4a62f7D4d3B1A6F1c0F23d7a1c2", amount: "800" },
    ],
  },
  split: {
    title: "按比例分账",
    desc: "输入总额与比例，自动计算分账",
    icon: PieChart,
    color: "text-sky",
    payoutType: 2,
    samples: [
      { address: "0x6B5bC9e7c7f49b1a20F49a0f2D1D8A98B6f0b0a1", amount: "", ratio: "40" },
      { address: "0x8E1B5C00d0e22bB6E5b93261c4d3Edc4bB5f3e4C", amount: "", ratio: "35" },
      { address: "0x1F9fD73C5b59b4a62f7D4d3B1A6F1c0F23d7a1c2", amount: "", ratio: "25" },
    ],
  },
  event: {
    title: "活动 / 门票奖励",
    desc: "批量导入地址，统一金额发放",
    icon: Calendar,
    color: "text-amber-400",
    payoutType: 3,
    samples: [
      { address: "0x6B5bC9e7c7f49b1a20F49a0f2D1D8A98B6f0b0a1", amount: "100" },
      { address: "0x8E1B5C00d0e22bB6E5b93261c4d3Edc4bB5f3e4C", amount: "100" },
      { address: "0x1F9fD73C5b59b4a62f7D4d3B1A6F1c0F23d7a1c2", amount: "100" },
    ],
  },
};

export default function EmployerPage() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") || "payroll") as SceneMode;
  const scene = sceneConfig[mode];
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
  const [importAmount, setImportAmount] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [recentPayoutId, setRecentPayoutId] = useState<bigint | null>(null);
  const [splitTotalAmount, setSplitTotalAmount] = useState<string>("");
  const [eventUniformAmount, setEventUniformAmount] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");

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
  const templateWrite = useWriteContract();
  const approveWrite = useWriteContract();
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

  const nextIdText = useMemo(() =>
    typeof nextPayoutId === "bigint" ? nextPayoutId.toString() : "加载中...",
    [nextPayoutId]);

  const currentFundTarget = useMemo(() => {
    if (!fundPayoutId) return "未选择";
    if (payout) return `${fundPayoutId}（${payout.closed ? "已关闭" : "开放"}）`;
    return `${fundPayoutId}（加载中）`;
  }, [fundPayoutId, payout]);

  const { isLoading: creatingOnChain, isSuccess: createConfirmed } =
    useWaitForTransactionReceipt({
      hash: createWrite.data,
      query: {
        enabled: Boolean(createWrite.data),
        refetchInterval: 2_000,
      },
    });

  const { isLoading: savingTemplate, isSuccess: templateSaved } =
    useWaitForTransactionReceipt({
      hash: templateWrite.data,
      query: {
        enabled: Boolean(templateWrite.data),
        refetchInterval: 2_000,
      },
    });

  const { isLoading: approvingOnChain, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveWrite.data,
      query: {
        enabled: Boolean(approveWrite.data),
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

  const fillSamples = () => setRecipients(scene.samples);

  const openImportModal = () => {
    setImportError(null);
    setImportText("");
    setImportAmount("");
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
        amount: mode === "event" ? eventUniformAmount : (importAmount || (prev[idx]?.amount ?? "")),
        ratio: mode === "split" ? (prev[idx]?.ratio ?? "") : undefined,
      }))
    );
    setIsImportOpen(false);
  };

  const applyUniformAmount = () => {
    if (!eventUniformAmount) return;
    setRecipients((prev) =>
      prev.map((r) => ({ ...r, amount: eventUniformAmount }))
    );
  };

  const calculateSplitAmounts = () => {
    if (!splitTotalAmount) return;
    const total = parseFloat(splitTotalAmount);
    if (isNaN(total) || total <= 0) return;

    setRecipients((prev) =>
      prev.map((r) => {
        const ratio = parseFloat(r.ratio || "0");
        const amount = ((ratio / 100) * total).toFixed(6);
        return { ...r, amount };
      })
    );
  };

  const totalRatio = useMemo(() => {
    if (mode !== "split") return 0;
    return recipients.reduce((sum, r) => sum + parseFloat(r.ratio || "0"), 0);
  }, [mode, recipients]);

  const handleSaveTemplate = async () => {
    setCreateError(null);
    try {
      if (!templateName.trim()) throw new Error("请输入模版名称");
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

      let gasLimit = 5000000n;
      try {
        if (publicClient && address) {
          const estimated = await publicClient.estimateContractGas({
            address: PAYOUT_MANAGER_ADDRESS,
            abi: payoutManagerAbi,
            functionName: "createTemplate",
            args: [templateName, token, recipientAddresses, amounts],
            account: address,
          });
          // Add 20% buffer
          gasLimit = (estimated * 120n) / 100n;
        }
      } catch (e) {
        console.warn("Template gas estimation failed", e);
      }

      await templateWrite.writeContractAsync({
        address: PAYOUT_MANAGER_ADDRESS,
        abi: payoutManagerAbi,
        functionName: "createTemplate",
        args: [templateName, token, recipientAddresses, amounts],
        gas: gasLimit,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存模版失败";
      setCreateError(message);
    }
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

      let gasLimit = 5000000n;
      try {
        if (publicClient && address) {
          const estimated = await publicClient.estimateContractGas({
            address: PAYOUT_MANAGER_ADDRESS,
            abi: payoutManagerAbi,
            functionName: "createPayout",
            args: [token, recipientAddresses, amounts, "", scene.payoutType],
            account: address,
          });
          // Add 20% buffer
          gasLimit = (estimated * 120n) / 100n;
        }
      } catch (e) {
        console.warn("Create payout gas estimation failed", e);
      }

      const hash = await createWrite.writeContractAsync({
        address: PAYOUT_MANAGER_ADDRESS,
        abi: payoutManagerAbi,
        functionName: "createPayout",
        args: [token, recipientAddresses, amounts, "", scene.payoutType],
        gas: gasLimit,
      });

      setCreatedPayoutId(expectedId);
      setRecentPayoutId(expectedId);

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

  const handleApprove = async () => {
    setFundError(null);
    try {
      if (!payout?.token || payout.token === zeroAddress) {
        throw new Error("原生币无需授权");
      }
      const amountWei = parseEther(fundAmount || "0");
      if (amountWei <= 0n) throw new Error("授权金额需大于 0");

      await approveWrite.writeContractAsync({
        address: payout.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [PAYOUT_MANAGER_ADDRESS, amountWei],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "授权失败";
      setFundError(message);
    }
  };

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
            <label className="space-y-2 block">
              <span className="text-sm text-slate">统一设置金额（可选）</span>
              <input
                className="input-base"
                placeholder="若填写，将为所有导入地址设置此金额"
                value={importAmount}
                onChange={(e) => setImportAmount(e.target.value)}
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
            <div className={`badge ${scene.color}`}>
              <scene.icon className="h-4 w-4 inline mr-1" />
              {scene.title}
            </div>
            <h1 className="text-3xl font-semibold mt-2">新建支付计划</h1>
            <p className="text-slate text-sm mt-2">
              {scene.desc}
            </p>
          </div>
        </div>

        <div className="card grid gap-3 md:grid-cols-3">
          <Stat label="雇主视角：下一清单编号" value={nextIdText} />
          <Stat
            label="最近创建编号"
            value={
              recentPayoutId !== null
                ? recentPayoutId.toString()
                : createdPayoutId !== null
                  ? createdPayoutId.toString()
                  : "尚未创建"
            }
          />
          <Stat label="当前充值对象" value={currentFundTarget} />
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

          {mode === "split" && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate">总金额</span>
                <input
                  className="input-base"
                  placeholder="输入要分配的总金额"
                  value={splitTotalAmount}
                  onChange={(e) => setSplitTotalAmount(e.target.value)}
                />
              </label>
              <div className="space-y-2">
                <span className="text-sm text-slate">比例总和</span>
                <div className={`glass-panel px-3 py-2 rounded-xl text-sm ${totalRatio === 100 ? "text-mint" : "text-amber-400"}`}>
                  {totalRatio.toFixed(2)}% {totalRatio === 100 ? "✓" : "⚠ 应为 100%"}
                </div>
              </div>
            </div>
          )}

          {mode === "event" && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate">统一金额</span>
                <input
                  className="input-base"
                  placeholder="所有收款人的统一金额"
                  value={eventUniformAmount}
                  onChange={(e) => setEventUniformAmount(e.target.value)}
                />
              </label>
              <div className="flex items-end">
                <button
                  className="button-secondary w-full"
                  onClick={applyUniformAmount}
                  disabled={!eventUniformAmount}
                >
                  应用到所有收款人
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate">
                {mode === "split" ? "收款人名单（设置分配比例）" : "收款人名单（金额单位：MON/Token）"}
              </span>
              <div className="flex items-center gap-2">
                {mode === "split" && splitTotalAmount && (
                  <button
                    className="button-secondary inline-flex items-center gap-2"
                    onClick={calculateSplitAmounts}
                  >
                    <Sparkles className="h-4 w-4" /> 计算金额
                  </button>
                )}
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
                  className={mode === "split" ? "grid gap-3 md:grid-cols-[1.5fr_0.7fr_1fr_auto] items-center" : "grid gap-3 md:grid-cols-[1.5fr_1fr_auto] items-center"}
                >
                  <input
                    className="input-base"
                    placeholder="钱包地址"
                    value={row.address}
                    onChange={(e) =>
                      handleRecipientChange(idx, "address", e.target.value)
                    }
                  />
                  {mode === "split" && (
                    <input
                      className="input-base"
                      placeholder="比例 %"
                      value={row.ratio || ""}
                      onChange={(e) =>
                        handleRecipientChange(idx, "ratio", e.target.value)
                      }
                    />
                  )}
                  <input
                    className="input-base"
                    placeholder={mode === "split" ? "计算后的金额" : "支付金额"}
                    value={row.amount}
                    onChange={(e) =>
                      handleRecipientChange(idx, "amount", e.target.value)
                    }
                    readOnly={mode === "split"}
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

          {mode === "payroll" && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate">模版名称（可选）</span>
                <input
                  className="input-base"
                  placeholder="例如：2024年工资发放"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </label>
              <div className="flex items-end">
                <button
                  className="button-secondary w-full inline-flex items-center justify-center gap-2"
                  onClick={handleSaveTemplate}
                  disabled={!isConnected || templateWrite.isPending || savingTemplate || !templateName.trim()}
                >
                  {templateWrite.isPending || savingTemplate ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 保存中
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> 保存为模版
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

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
            {templateSaved ? (
              <span className="text-xs text-mint">模版保存成功！</span>
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
            {!isNativeToken && payout ? (
              <button
                className="button-secondary inline-flex items-center gap-2"
                onClick={handleApprove}
                disabled={!isConnected || approveWrite.isPending || approvingOnChain}
              >
                {approveWrite.isPending || approvingOnChain ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> 授权中
                  </>
                ) : (
                  <>
                    授权代币
                  </>
                )}
              </button>
            ) : null}
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
            {approveConfirmed ? (
              <span className="text-xs text-mint">授权成功</span>
            ) : null}
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
