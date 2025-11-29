import payoutManagerAbiJson from "./payoutManager.abi.json";
import { Address, type Abi } from "viem";

export const PAYOUT_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_PAYOUT_MANAGER_ADDRESS ??
  "0xA162A14bA82c59cd6A4780B145989F8460C1587d") as Address;

export const payoutManagerAbi = payoutManagerAbiJson as unknown as Abi;

// 通用 ERC20 ABI（来自 IERC20）
export const erc20Abi = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
