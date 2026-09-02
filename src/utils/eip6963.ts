/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/eip6963.ts
// Discovery de wallets multi-inyectadas según EIP-6963 + fallback legacy window.ethereum

// ============================================================================
// TIPOS EIP-1193 / EIP-6963
// ============================================================================

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  [key: string]: unknown;
}

export interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

export interface WalletOption {
  id: string; // rdns (EIP-6963) o identificador legacy generado
  name: string;
  icon: string; // data URI; vacío => usar icono fallback
  provider: Eip1193Provider;
}

// ============================================================================
// GLOBAL
// ============================================================================
// Nota: `window.ethereum` ya está declarado globalmente por viem (EIP1193Provider).
// Para el fallback legacy lo casteamos a nuestro tipo extendido.

// ============================================================================
// PERSISTENCIA (reemplaza cacheProvider de web3modal)
// ============================================================================

const WALLET_STORAGE_KEY = "eip6963:walletId";

export const getStoredWalletId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(WALLET_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredWalletId = (id: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, id);
  } catch {
    // localStorage no disponible
  }
};

export const clearStoredWalletId = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    // localStorage no disponible
  }
};

// ============================================================================
// DISCOVERY
// ============================================================================

/**
 * Obtiene wallets detectadas vía EIP-6963 (evento announceProvider).
 * Cada wallet instalada anuncia info + su propio provider EIP-1193.
 */
const discoverEip6963Wallets = (): Promise<Eip6963ProviderDetail[]> => {
  return new Promise((resolve) => {
    const wallets: Eip6963ProviderDetail[] = [];

    const onAnnounce = (event: CustomEvent<Eip6963ProviderDetail>) => {
      wallets.push(event.detail);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);

    // Disparar el request: las wallets responden de forma síncrona/inmediata
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Dar una ventana breve para que todas las extensiones respondan
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
      resolve(wallets);
    }, 150);
  });
};

/**
 * Fallback legacy: wallets que no soportan EIP-6963 exponen window.ethereum
 * (o window.ethereum.providers cuando hay varias compitiendo).
 */
const discoverLegacyWallets = (): WalletOption[] => {
  if (typeof window === "undefined") return [];

  const eth = (window as { ethereum?: unknown }).ethereum as Eip1193Provider | undefined;
  if (!eth) return [];

  const legacy: WalletOption[] = [];

  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    eth.providers.forEach((p, index) => {
      const name =
        (p as any).isRabby ? "Rabby"
        : (p as any).isTrust ? "Trust Wallet"
        : (p as any).isCoinbaseWallet ? "Coinbase Wallet"
        : (p as any).isBraveWallet ? "Brave Wallet"
        : (p as any).isOkxWallet ? "OKX Wallet"
        : (p as any).isMetaMask ? "MetaMask"
        : `Wallet ${index + 1}`;
      legacy.push({
        id: `legacy-${name.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        name,
        icon: "",
        provider: p,
      });
    });
  } else {
    const name =
      (eth as any).isRabby ? "Rabby"
      : (eth as any).isTrust ? "Trust Wallet"
      : (eth as any).isCoinbaseWallet ? "Coinbase Wallet"
      : (eth as any).isBraveWallet ? "Brave Wallet"
      : (eth as any).isOkxWallet ? "OKX Wallet"
      : (eth as any).isMetaMask ? "MetaMask"
      : "Browser Wallet";
    legacy.push({
      id: `legacy-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      icon: "",
      provider: eth,
    });
  }

  return legacy;
};

/**
 * Descubre todas las wallets disponibles (EIP-6963 + fallback legacy),
 * deduplicando por rdns/nombre.
 */
export const discoverWallets = async (): Promise<WalletOption[]> => {
  const eip6963 = await discoverEip6963Wallets();
  const eip6963Options: WalletOption[] = eip6963.map((detail) => ({
    id: detail.info.rdns || detail.info.uuid,
    name: detail.info.name,
    icon: detail.info.icon,
    provider: detail.provider,
  }));

  const legacyOptions = discoverLegacyWallets();

  // Deduplicar: si una wallet ya fue anunciada vía EIP-6963, ignorar su duplicado legacy
  const seenNames = new Set(eip6963Options.map((w) => w.name.toLowerCase()));
  const merged = [
    ...eip6963Options,
    ...legacyOptions.filter((w) => !seenNames.has(w.name.toLowerCase())),
  ];

  return merged;
};

/**
 * Icono fallback (SVG data URI) para wallets que no proveen icono.
 */
export const FALLBACK_WALLET_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 01 0-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>`
  );
