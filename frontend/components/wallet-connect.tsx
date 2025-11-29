"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "@/lib/format";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);

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

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="badge">已连接 {truncateAddress(address)}</span>
        <button className="button-secondary" onClick={() => disconnect()}>断开</button>
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
