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

const chains = [hardhat, sepolia, mainnet] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [hardhat.id]: http(rpcUrl ?? "http://127.0.0.1:8545"),
    [sepolia.id]: http(),
    [mainnet.id]: http()
  },
  ssr: true
});
