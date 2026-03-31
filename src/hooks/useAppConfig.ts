/**
 * Hook React para acceder a la configuración de la aplicación
 * Carga la config desde /config/contracts.json en client-side
 */

"use client";

import { useState, useEffect } from "react";
import type { AppConfig } from "@/config/app.config";
import { getClientConfig, serverConfig } from "@/config/app.config";

interface UseAppConfigReturn {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para cargar y usar la configuración de la aplicación
 *
 * @example
 * const { config, isLoading } = useAppConfig();
 * if (isLoading) return <div>Loading...</div>;
 * console.log(config.contracts.token);
 */
export function useAppConfig(): UseAppConfigReturn {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedConfig = await getClientConfig();
      setConfig(loadedConfig);
    } catch (err) {
      console.error("Error loading app config:", err);
      setError("Failed to load configuration");
      // Fallback to server config
      setConfig(serverConfig);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    isLoading,
    error,
    refetch: loadConfig,
  };
}

/**
 * Hook simplificado que retorna la config inmediatamente
 * Útil cuando ya sabes que la config está cargada
 *
 * @example
 * const config = useAppConfigSync();
 * console.log(config.contracts.token);
 */
export function useAppConfigSync(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(serverConfig);

  useEffect(() => {
    getClientConfig().then(setConfig);
  }, []);

  return config;
}
