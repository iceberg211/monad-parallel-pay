"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useChains,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain
} from "wagmi";
import { truncateAddress } from "@/lib/format";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chains = useChains();
  const currentChainId = useChainId();
  const { chains: switchableChains, switchChainAsync, isPending: switching } = useSwitchChain();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address,
    chainId: currentChainId,
    query: {
      enabled: isConnected
    }
  });
  const [error, setError] = useState<string | null>(null);
  const availableChains = useMemo(() => switchableChains ?? chains, [switchableChains, chains]);

  const handleConnect = async () => {
    setError(null);
    try {
      const preferred = connectors[0];
      if (!preferred) throw new Error("无可用钱包连接器");
      await connectAsync({ connector: preferred });
    } catch (err) {
      const message = err instanceof Error ? err.message : "连接失败";
      setError(message);
    }
  };

  const handleSwitch = async (chainId: number) => {
    setError(null);
    try {
      await switchChainAsync({ chainId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "切换网络失败";
      setError(message);
    }
  };

  if (isConnected) {
    return (
      <div className="glass-panel border border-border/70 rounded-2xl px-4 py-3 w-full sm:w-[420px] min-w-[320px] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="badge">已连接 {truncateAddress(address)}</span>
          <button className="button-secondary" onClick={() => disconnect()}>断开</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <label className="text-xs text-slate flex flex-col gap-1">
            <span className="uppercase tracking-wide">网络</span>
            <select
              className="input-base w-full"
              value={currentChainId}
              onChange={(e) => handleSwitch(Number(e.target.value))}
              disabled={switching}
            >
              {availableChains.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-slate flex flex-col leading-tight">
            <span className="uppercase tracking-wide">余额</span>
            <span className="text-sm text-white font-semibold">
              {balanceLoading ? "加载中..." : balance ? `${balance.formatted.slice(0, 10)} ${balance.symbol}` : "-"}
            </span>
          </div>
        </div>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button className="button-primary" onClick={handleConnect} disabled={isPending}>
        {isPending ? "连接中..." : "连接钱包"}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
