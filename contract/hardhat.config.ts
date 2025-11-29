import * as dotenv from "dotenv";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

// 加载 .env（用于 RPC、私钥）
dotenv.config();

const privateKey = process.env.PRIVATE_KEY
  ? process.env.PRIVATE_KEY.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`
  : undefined;

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz/",
      chainId: 10143,
      accounts: privateKey ? [privateKey] : [],
    },
  },
});
