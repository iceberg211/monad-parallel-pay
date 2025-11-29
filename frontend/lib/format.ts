import { formatEther } from "viem";

export function truncateAddress(addr?: string) {
  if (!addr) return "-";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatAmount(value?: bigint, decimals = 18) {
  if (value === undefined) return "-";
  try {
    if (decimals === 18) return formatEther(value);
    // 简单降级：非 18 位直接返回整数值
    return value.toString();
  } catch {
    return value.toString();
  }
}

export function formatToken(token: string) {
  return token === "0x0000000000000000000000000000000000000000" ? "Native" : token;
}
