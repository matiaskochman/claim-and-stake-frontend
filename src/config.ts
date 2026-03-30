import { http, createConfig } from "wagmi";
import { mainnet, sepolia, bscTestnet } from "wagmi/chains";
import { injected, metaMask, safe } from "wagmi/connectors";
import { defineChain } from "viem";

// Leer configuración desde variables de entorno
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "41337");
const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "Localhost 41337";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

// Definir la red personalizada usando variables de entorno
const customChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  network: "localhost",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "Localhost Explorer", url: RPC_URL },
  },
  testnet: true,
});

// Configurar wagmi con las cadenas
export const config = createConfig({
  chains: [mainnet, sepolia, bscTestnet, customChain],

  multiInjectedProviderDiscovery: false,
  ssr: false,
  connectors: [injected(), metaMask(), safe()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [bscTestnet.id]: http(),
    [customChain.id]: http(),
  },
});
