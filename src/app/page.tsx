"use client";
import { useState, useEffect } from "react";
import {
  connectWallet,
  fetchTokenBalance,
  claimTokens,
  stakeTokens,
  unstakeTokens,
  logout,
  fetchHasClaimed,
  fetchPendingRewards,
  fetchStakeInfo,
  isContractOwner,
  setRewardRate,
  setClaimAmount,
  pauseStaking,
  unpauseStaking,
  pauseFaucet,
  unpauseFaucet,
  pauseToken,
  unpauseToken,
  resetClaim,
  emergencyWithdraw,
} from "@/utils/web3Utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { cn } from "@/lib/utils";
import { useAppConfig } from "@/hooks/useAppConfig";
import { ContractAddressRow } from "@/components/ContractAddressRow";

// Helper para formatear el tiempo transcurrido
const formatTimeElapsed = (since: bigint): string => {
  if (!since || since === 0n) return "No hay stake activo";

  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - Number(since);

  const days = Math.floor(elapsed / 86400);
  const hours = Math.floor((elapsed % 86400) / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);

  if (days > 0) {
    return `${days} día${days !== 1 ? "s" : ""} ${hours} hora${hours !== 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hora${hours !== 1 ? "s" : ""} ${minutes} minuto${minutes !== 1 ? "s" : ""}`;
  } else {
    return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;
  }
};

// Helper para formatear la fecha
const formatStartDate = (since: bigint): string => {
  if (!since || since === 0n) return "";
  const date = new Date(Number(since) * 1000);
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function Web3TokenDashboard() {
  const [balance, setBalance] = useState<number>(0);
  const [stakedAmount, setStakedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<bigint | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [unstakeAmount, setUnstakeAmount] = useState<number>(0);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  // Nuevos estados
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [stakeStartTime, setStakeStartTime] = useState<bigint | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  // Estados admin
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
  const [newRewardRate, setNewRewardRate] = useState<number>(1);
  const [newClaimAmount, setNewClaimAmount] = useState<number>(200);
  const [resetAddress, setResetAddress] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);

  // Cargar configuración runtime desde /config/contracts.json
  const { config, isLoading: configLoading } = useAppConfig();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const init = async () => {
      const web3Modal = new Web3Modal({ cacheProvider: true });
      if (web3Modal.cachedProvider) {
        await connectWallet(
          setProvider,
          setSigner,
          setAccount,
          setIsConnected,
          setError,
          setCurrentChainId,
          setStakedAmount,
          setBalance,
          config!.chain.id
        );
        // Fetch hasClaimed after connection is established
        setTimeout(async () => {
          if (signer && account) {
            const claimed = await fetchHasClaimed(account, signer, setError);
            setHasClaimed(claimed);
            // Verificar si es owner del contrato staking
            const owner = await isContractOwner(config!.contracts.staking, signer);
            setIsOwner(owner);
          }
        }, 100);
      }
    };

    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setHasClaimed(false); // Reset before fetching new state
          await connectWallet(
            setProvider,
            setSigner,
            setAccount,
            setIsConnected,
            setError,
            setCurrentChainId,
            setStakedAmount,
            setBalance,
            config!.chain.id
          );
          // Fetch hasClaimed after connection is established
          setTimeout(async () => {
            if (signer) {
              const claimed = await fetchHasClaimed(accounts[0], signer, setError);
              setHasClaimed(claimed);
              // Verificar si es owner del contrato staking
              const owner = await isContractOwner(config!.contracts.staking, signer);
              setIsOwner(owner);
            }
          }, 100);
        } else {
          handleLogout();
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", () => {});
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
  }, []);

  // Auto-refresh de recompensas cada 30 segundos
  useEffect(() => {
    if (isConnected && stakedAmount > 0 && signer && account) {
      // Fetch inicial
      fetchPendingRewards(account, signer).then(setPendingRewards);

      // Fetch de stake info para obtener el timestamp
      fetchStakeInfo(account, signer).then((info) => {
        if (info.since !== 0n) {
          setStakeStartTime(info.since);
        }
      });

      // Intervalo para actualizar recompensas
      const interval = setInterval(async () => {
        const rewards = await fetchPendingRewards(account, signer);
        setPendingRewards(rewards);
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    } else if (stakedAmount === 0) {
      setPendingRewards(0);
      setStakeStartTime(null);
    }
  }, [isConnected, stakedAmount, account, signer]);

  const handleClaimtokens = async () => {
    setLoading(true);
    await claimTokens(signer, provider, setLoading, setError, setTxHash, setCancelled);
    if (provider && signer && account) {
      // Ahora puedes llamar a fetchTokenBalance u otras funciones que necesites
      await fetchTokenBalance(signer, account, setBalance, setError);
      // Actualizar estado hasClaimed después de un claim exitoso
      const claimed = await fetchHasClaimed(account, signer, setError);
      setHasClaimed(claimed);
    }

    setLoading(false);
  };
  const handleConnectWallet = async () => {
    setLoading(true);
    await connectWallet(
      setProvider,
      setSigner,
      setAccount,
      setIsConnected,
      setError,
      setCurrentChainId,
      setStakedAmount,
      setBalance,
      config!.chain.id // Por ejemplo, si quieres que cambie a esta red
    );
    setLoading(false);

    if (provider && signer && account) {
      // Ahora puedes llamar a fetchTokenBalance u otras funciones que necesites
      await fetchTokenBalance(signer, account, setBalance, setError);
      const claimed = await fetchHasClaimed(account, signer, setError);
      setHasClaimed(claimed);
    }
  };
  const handleUnstake = async () => {
    await unstakeTokens(
      signer,
      provider,
      unstakeAmount,
      setLoading,
      setError,
      setTxHash,
      setStakedAmount,
      () => {}, // setStakingStart (unused)
      () => {}, // setStakingRewards (unused)
      setCancelled
    );
    if (provider && signer && account) {
      // Ahora puedes llamar a fetchTokenBalance u otras funciones que necesites
      await fetchTokenBalance(signer, account, setBalance, setError);
      // Actualizar recompensas y stake info
      const rewards = await fetchPendingRewards(account, signer);
      setPendingRewards(rewards);
      const stakeInfo = await fetchStakeInfo(account, signer);
      if (stakeInfo.since === 0n) {
        setStakeStartTime(null);
      } else {
        setStakeStartTime(stakeInfo.since);
      }
    }
  };
  const handleStake = async () => {
    await stakeTokens(
      signer,
      provider,
      stakeAmount,
      setLoading,
      setError,
      setTxHash,
      setStakedAmount,
      () => {}, // setStakingStart (unused)
      setCancelled
    );
    if (provider && signer && account) {
      // Ahora puedes llamar a fetchTokenBalance u otras funciones que necesites
      await fetchTokenBalance(signer, account, setBalance, setError);
      // Actualizar recompensas y stake info
      const rewards = await fetchPendingRewards(account, signer);
      setPendingRewards(rewards);
      const stakeInfo = await fetchStakeInfo(account, signer);
      if (stakeInfo.since !== 0n) {
        setStakeStartTime(stakeInfo.since);
      }
    }
  };
  const handleLogout = async () => {
    logout(
      setAccount,
      setProvider,
      setSigner,
      setIsConnected,
      setBalance,
      setStakedAmount,
      () => {}, // setStakingStart (unused)
      () => {}, // setStakingRewards (unused)
      setCurrentChainId,
      setError,
      setTxHash
    );
    setHasClaimed(false);
  };

  const checkAdminStatus = async () => {
    if (signer) {
      console.log("Verificando admin status...");
      console.log("Contrato Staking:", config!.contracts.staking);
      const owner = await isContractOwner(config!.contracts.staking, signer);
      console.log("¿Es owner?", owner);
      console.log("Cuenta actual:", account);
      setIsOwner(owner);
      setError(owner ? null : "No eres el owner del contrato Staking");
    }
  };

  // Mostrar loading mientras se carga la configuración
  if (configLoading || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-purple-600 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Cargando configuración...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Claim & Stake
          </CardTitle>
          <p className="text-sm text-gray-500">Reclama y stakea tus tokens</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {!isConnected ? (
            <div className="pt-4">
              <Button
                onClick={handleConnectWallet}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-6 text-lg shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Conectando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Conectar Wallet
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Balance Cards - Ahora 3 columnas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs text-gray-500 mb-1">Tu Balance</p>
                  <p className="text-2xl font-bold text-gray-800">{balance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">tokens</p>
                  {hasClaimed && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Claim realizado
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs text-gray-500 mb-1">Staked</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stakedAmount !== undefined && !isNaN(stakedAmount)
                      ? stakedAmount.toFixed(2)
                      : "0.00"}
                  </p>
                  <p className="text-xs text-gray-500">tokens</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100 relative">
                  <p className="text-xs text-gray-500 mb-1">Recompensas</p>
                  <p className="text-2xl font-bold text-gray-800">{pendingRewards.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">tokens</p>
                  {pendingRewards > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      ¡Disponibles!
                    </div>
                  )}
                </div>
              </div>

              {/* Stake Info Card */}
              {stakeStartTime && stakeStartTime !== 0n && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-indigo-700">
                      Stakeando desde hace: {formatTimeElapsed(stakeStartTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Inicio: {formatStartDate(stakeStartTime)}</p>
                  </div>
                </div>
              )}

              {/* Account Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Cuenta:</span>
                <span className="font-mono text-sm bg-white px-3 py-1 rounded-md border">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </span>
              </div>

              {/* Admin Status Indicator */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Admin:</span>
                  {isOwner ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Owner
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                      Usuario
                    </span>
                  )}
                </div>
                <Button
                  onClick={checkAdminStatus}
                  disabled={loading || !signer}
                  variant="outline"
                  className="h-8 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Verificar
                </Button>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleClaimtokens}
                  disabled={loading || currentChainId !== config!.chain.id || hasClaimed}
                  className={cn(
                    "w-full text-white font-medium py-6 shadow-lg",
                    hasClaimed
                      ? "bg-gray-400 cursor-not-allowed opacity-70"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  )}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Reclamando...
                    </span>
                  ) : hasClaimed ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Ya reclamaste
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Claim Tokens
                    </span>
                  )}
                </Button>

                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Stake Tokens</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(Number(e.target.value))}
                      placeholder="Cantidad"
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                    <Button
                      onClick={handleStake}
                      disabled={loading || currentChainId !== config!.chain.id}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                    >
                      {loading ? "..." : "Stake"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Unstake Tokens</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(Number(e.target.value))}
                      placeholder="Cantidad"
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                    <Button
                      onClick={handleUnstake}
                      disabled={loading || currentChainId !== config!.chain.id}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6"
                    >
                      {loading ? "..." : "Unstake"}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleLogout}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Desconectar
                </Button>
              </div>

              {/* Sección de Administración - Solo visible para owners */}
              {isOwner && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setAdminSectionOpen(!adminSectionOpen)}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-lg hover:from-slate-900 hover:to-black transition-all"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      ⚙️ Panel de Administración
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${adminSectionOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {adminSectionOpen && (
                    <div className="mt-3 space-y-4">
                      {/* Staking Admin */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Staking
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => signer && setRewardRate(newRewardRate, signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                          >
                            Set Reward Rate
                          </Button>
                          <input
                            type="number"
                            value={newRewardRate}
                            onChange={(e) => setNewRewardRate(Number(e.target.value))}
                            className="p-2 border rounded text-sm"
                            placeholder="Rate"
                          />
                          <Button
                            onClick={() => signer && pauseStaking(signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
                          >
                            Pause
                          </Button>
                          <Button
                            onClick={() => signer && unpauseStaking(signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          >
                            Unpause
                          </Button>
                        </div>
                      </div>

                      {/* Faucet Admin */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                          Faucet
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Button
                            onClick={() => signer && setClaimAmount(newClaimAmount, signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          >
                            Set Claim Amount
                          </Button>
                          <input
                            type="number"
                            value={newClaimAmount}
                            onChange={(e) => setNewClaimAmount(Number(e.target.value))}
                            className="p-2 border rounded text-sm"
                            placeholder="Amount"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => signer && pauseFaucet(signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
                          >
                            Pause
                          </Button>
                          <Button
                            onClick={() => signer && unpauseFaucet(signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                          >
                            Unpause
                          </Button>
                          <Button
                            onClick={() => signer && resetClaim(resetAddress, signer, setLoading, setError, setTxHash)}
                            disabled={loading || !resetAddress || !signer}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                          >
                            Reset Claim
                          </Button>
                        </div>
                        <input
                          type="text"
                          value={resetAddress}
                          onChange={(e) => setResetAddress(e.target.value)}
                          className="mt-2 w-full p-2 border rounded text-sm"
                          placeholder="Address para reset claim"
                        />
                      </div>

                      {/* Token Admin */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Token (MyToken)
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => signer && pauseToken(signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
                          >
                            Pause
                          </Button>
                          <Button
                            onClick={() => signer && unpauseToken(signer, setLoading, setError, setTxHash)}
                            disabled={loading || !signer}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                          >
                            Unpause
                          </Button>
                        </div>
                      </div>

                      {/* Emergency Withdraw */}
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Emergency Withdraw (Faucet)
                        </h4>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={withdrawAddress}
                            onChange={(e) => setWithdrawAddress(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Dirección destino"
                          />
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Cantidad"
                          />
                          <Button
                            onClick={() => signer && emergencyWithdraw(withdrawAddress, withdrawAmount, signer, setLoading, setError, setTxHash)}
                            disabled={loading || !withdrawAddress || !withdrawAmount || !signer}
                            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
                          >
                            Emergency Withdraw
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {txHash && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-emerald-700 text-sm font-medium">Transacción enviada</p>
                <a
                  href={`https://testnet.bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 text-xs underline break-all hover:text-emerald-700"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </div>
              <button
                onClick={() => setTxHash(null)}
                className="text-emerald-400 hover:text-emerald-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          {cancelled && (
            <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg flex items-center gap-2 text-gray-600 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Transacción cancelada</span>
            </div>
          )}
          {currentChainId !== config!.chain.id && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-amber-700 text-sm flex-1">
                Cambia a la red configurada (chain ID {config!.chain.id.toString()}) para reclamar los tokens.
              </p>
            </div>
          )}
          {/* Contract Addresses */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 text-center font-medium">Contract Addresses</p>
            <div className="space-y-2">
              <ContractAddressRow
                label="Token"
                address={config!.contracts.token}
                explorerUrl={`https://testnet.bscscan.com/address/${config!.contracts.token}`}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <ContractAddressRow
                label="Faucet"
                address={config!.contracts.faucet}
                explorerUrl={`https://testnet.bscscan.com/address/${config!.contracts.faucet}`}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                }
              />
              <ContractAddressRow
                label="Staking"
                address={config!.contracts.staking}
                explorerUrl={`https://testnet.bscscan.com/address/${config!.contracts.staking}`}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
