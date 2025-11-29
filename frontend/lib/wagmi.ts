import { defineChain } from "viem";
import { hardhat, mainnet, sepolia } from "wagmi/chains";
import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const monadMainnetRpc = process.env.NEXT_PUBLIC_MONAD_MAINNET_RPC;
const monadTestnetRpc = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC;

const monadMainnet = defineChain({
  id: 20143,
  name: "Monad Mainnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: monadMainnetRpc ? [monadMainnetRpc] : ["https://rpc.monad.xyz"] },
    public: { http: monadMainnetRpc ? [monadMainnetRpc] : ["https://rpc.monad.xyz"] }
  },
  blockExplorers: {
    default: {
      name: "MonadScan",
      url: "https://explorer.monad.xyz"
    }
  }
});

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Test MON", symbol: "tMON", decimals: 18 },
  rpcUrls: {
    default: { http: monadTestnetRpc ? [monadTestnetRpc] : ["https://testnet-rpc.monad.xyz"] },
    public: { http: monadTestnetRpc ? [monadTestnetRpc] : ["https://testnet-rpc.monad.xyz"] }
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://explorer.testnet.monad.xyz"
    }
  }
});

const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true
        })
      ]
    : [])
];

const chains = [monadMainnet, monadTestnet, hardhat, sepolia, mainnet] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [hardhat.id]: http(rpcUrl ?? "http://127.0.0.1:8545"),
    [monadMainnet.id]: http(monadMainnetRpc ?? "https://rpc.monad.xyz"),
    [monadTestnet.id]: http(monadTestnetRpc ?? "https://testnet-rpc.monad.xyz"),
    [sepolia.id]: http(),
    [mainnet.id]: http()
  },
  ssr: true
});
