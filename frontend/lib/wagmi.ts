import { hardhat, mainnet, sepolia } from "wagmi/chains";
import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

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

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
} as const;

const chains = [hardhat, sepolia, mainnet, monadTestnet] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [hardhat.id]: http(rpcUrl ?? "http://127.0.0.1:8545"),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [monadTestnet.id]: http()
  },
  ssr: true
});
