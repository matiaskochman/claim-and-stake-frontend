import { http, createConfig, createStorage, createClient } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, metaMask, safe } from "wagmi/connectors";
import { defineChain } from "viem";

// Definir la red personalizada localhost con chainId 41337
const localhost = defineChain({
  id: 41337,
  name: "Localhost 41337",
  network: "localhost",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"], // URL de tu nodo local (Hardhat, Ganache, etc.)
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: { name: "Localhost Explorer", url: "http://127.0.0.1:8545" },
  },
  testnet: true, // Marcar como testnet
});

// Configurar wagmi con las cadenas
export const config = createConfig({
  chains: [mainnet, sepolia], //localhost], // Agregar la red localhost

  multiInjectedProviderDiscovery: false,
  ssr: false, // is in server side rendering?
  // storage: createStorage({ storage: window.localStorage }),
  connectors: [injected(), metaMask(), safe()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [localhost.id]: http(), // Agregar transport para localhost
  },
});
