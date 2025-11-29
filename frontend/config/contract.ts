import { Address } from "viem";

export const PAYOUT_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_PAYOUT_MANAGER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;

export const payoutManagerAbi = [
  {
    "type": "event",
    "name": "PayoutCreated",
    "inputs": [
      { "name": "payoutId", "type": "uint256", "indexed": true },
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "token", "type": "address", "indexed": true },
      { "name": "totalAmount", "type": "uint256", "indexed": false },
      { "name": "recipientsCount", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayoutFunded",
    "inputs": [
      { "name": "payoutId", "type": "uint256", "indexed": true },
      { "name": "from", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayoutClaimed",
    "inputs": [
      { "name": "payoutId", "type": "uint256", "indexed": true },
      { "name": "recipient", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayoutClosed",
    "inputs": [{ "name": "payoutId", "type": "uint256", "indexed": true }],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RemainingWithdrawn",
    "inputs": [
      { "name": "payoutId", "type": "uint256", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "function",
    "name": "createPayout",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "recipients", "type": "address[]" },
      { "name": "amounts", "type": "uint256[]" }
    ],
    "outputs": [{ "name": "payoutId", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "fundPayout",
    "stateMutability": "payable",
    "inputs": [
      { "name": "payoutId", "type": "uint256" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "claim",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "payoutId", "type": "uint256" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "closePayout",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "payoutId", "type": "uint256" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawRemaining",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "payoutId", "type": "uint256" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getBatchClaimable",
    "stateMutability": "view",
    "inputs": [
      { "name": "payoutId", "type": "uint256" },
      { "name": "users", "type": "address[]" }
    ],
    "outputs": [{ "name": "amounts", "type": "uint256[]" }]
  },
  {
    "type": "function",
    "name": "payouts",
    "stateMutability": "view",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "creator", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "totalAmount", "type": "uint256" },
      { "name": "fundedAmount", "type": "uint256" },
      { "name": "closed", "type": "bool" }
    ]
  },
  {
    "type": "function",
    "name": "claimable",
    "stateMutability": "view",
    "inputs": [
      { "name": "", "type": "uint256" },
      { "name": "", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "nextPayoutId",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  }
] as const;

// 通用 ERC20 ABI（来自 /Users/yutianxiang/Downloads/IERC20.json）
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
