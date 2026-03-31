// ============================================================================
// CONFIGURACIÓN CENTRALIZADA DE LA APLICACIÓN
// ============================================================================
// Soporta tanto config desde variables de entorno (server-side) como
// desde JSON público (client-side runtime)

export interface AppConfig {
  chain: {
    id: bigint;
    idHex: string;
    name: string;
    rpcUrl: string;
  };
  contracts: {
    token: string;
    faucet: string;
    staking: string;
  };
}

interface ConfigJson {
  chain: {
    id: string;
    name: string;
    rpcUrl: string;
  };
  contracts: {
    token: string;
    faucet: string;
    staking: string;
  };
}

// ============================================================================
// SERVER-SIDE CONFIG (usado en build time y server components)
// ============================================================================

export const serverConfig: AppConfig = {
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

// ============================================================================
// CLIENT-SIDE RUNTIME CONFIG (carga desde JSON público)
// ============================================================================

let clientConfigCache: AppConfig | null = null;

/**
 * Carga la configuración desde /config/contracts.json
 * Cacheado para evitar múltiples fetches
 */
export async function getClientConfig(): Promise<AppConfig> {
  if (clientConfigCache) {
    return clientConfigCache;
  }

  if (typeof window === 'undefined') {
    // Server-side: retornar config desde variables de entorno
    return serverConfig;
  }

  try {
    const response = await fetch('/config/contracts.json');
    if (!response.ok) {
      console.warn('No se pudo cargar contracts.json, usando valores por defecto');
      return serverConfig;
    }

    const data: ConfigJson = await response.json();

    clientConfigCache = {
      chain: {
        id: BigInt(data.chain.id),
        idHex: `0x${BigInt(data.chain.id).toString(16)}`,
        name: data.chain.name,
        rpcUrl: data.chain.rpcUrl,
      },
      contracts: {
        token: data.contracts.token,
        faucet: data.contracts.faucet,
        staking: data.contracts.staking,
      },
    };

    return clientConfigCache;
  } catch (error) {
    console.error('Error al cargar config desde JSON:', error);
    return serverConfig;
  }
}

/**
 * Obtiene la configuración de forma síncrona.
 * En client-side, requiere que getClientConfig() haya sido llamado primero.
 * En server-side, usa process.env directamente.
 */
export function getConfigSync(): AppConfig {
  if (typeof window === 'undefined') {
    return serverConfig;
  }

  if (!clientConfigCache) {
    console.warn('getConfigSync llamado antes de getClientConfig, usando valores por defecto');
    return serverConfig;
  }

  return clientConfigCache;
}

// ============================================================================
// EXPORTS COMPATIBILIDAD (LEGACY)
// ============================================================================

// Para compatibilidad con código existente
// Nota: Estos siempre retornan los valores de serverConfig
// Para valores actualizados en client-side, usar getClientConfig()
export const chain = serverConfig.chain;
export const contracts = serverConfig.contracts;
export const CHAIN_ID = serverConfig.chain.id;
export const appConfig = serverConfig;
