"use client";
// hooks/useEip6963Providers.ts

import { useCallback, useEffect, useState } from "react";
import { discoverWallets, type WalletOption } from "@/utils/eip6963";

export const useEip6963Providers = () => {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(true);

  const refresh = useCallback(async () => {
    setIsDiscovering(true);
    const found = await discoverWallets();
    setWallets(found);
    setIsDiscovering(false);
    return found;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { wallets, isDiscovering, refresh };
};
