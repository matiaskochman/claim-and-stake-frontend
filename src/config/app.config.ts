// Configuración centralizada de la aplicación
export const appConfig = {
  chain: {
    id: BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "41337"),
    idHex: `0x${BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "41337").toString(16)}`,
    name: process.env.NEXT_PUBLIC_CHAIN_NAME || "Hardhat Localhost",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
  },
  contracts: {
    token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x03Cf79CB9CAb8C63677E1E6a86C23d32b669e980",
    faucet: process.env.NEXT_PUBLIC_FAUCET_ADDRESS || "0xc52A4D4171AAFe14dE93ebCC3C9C47053Ce74BE7",
    staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS || "0x8b858D12125B781e45FBc6D0C9474bB560d3f4E5",
  },
} as const;

// Exportar valores individualmente para conveniencia
export const { chain, contracts } = appConfig;
export const CHAIN_ID = appConfig.chain.id;
