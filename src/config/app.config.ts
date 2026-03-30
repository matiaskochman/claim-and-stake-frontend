// Configuración centralizada de la aplicación
export const appConfig = {
  chain: {
    id: BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "41337"),
    idHex: `0x${BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "41337").toString(16)}`,
    name: process.env.NEXT_PUBLIC_CHAIN_NAME || "Hardhat Localhost",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
  },
  contracts: {
    token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x411301f02bD96d6cB681a6573D50a66bF029A38d",
    faucet: process.env.NEXT_PUBLIC_FAUCET_ADDRESS || "0x47F8fa91DBcEE8cFdB95490695Fe753EB908d91B",
    staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS || "0xE58d317789a25C78b912734678D8e0dC878Fe5D9",
  },
} as const;

// Exportar valores individualmente para conveniencia
export const { chain, contracts } = appConfig;
export const CHAIN_ID = appConfig.chain.id;
