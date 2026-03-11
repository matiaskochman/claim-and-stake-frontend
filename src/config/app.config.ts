// Configuración centralizada de la aplicación
export const appConfig = {
  chain: {
    id: BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "41337"),
    idHex: `0x${BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "41337").toString(16)}`,
    name: process.env.NEXT_PUBLIC_CHAIN_NAME || "Hardhat Localhost",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
  },
  contracts: {
    token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    faucet: process.env.NEXT_PUBLIC_FAUCET_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  },
} as const;

// Exportar valores individualmente para conveniencia
export const { chain, contracts } = appConfig;
export const CHAIN_ID = appConfig.chain.id;
