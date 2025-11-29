import { mainnet, sepolia } from "wagmi/chains";
import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const monadTestnetRpc = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC;

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
    default: { http: [monadTestnetRpc ?? "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
} as const;

const chains = [monadTestnet, sepolia, mainnet] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [monadTestnet.id]: http(monadTestnetRpc ?? "https://testnet-rpc.monad.xyz"),
    [sepolia.id]: http(),
    [mainnet.id]: http()
  },
  ssr: true
});
