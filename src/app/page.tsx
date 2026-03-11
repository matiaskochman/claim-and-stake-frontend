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
} from "@/utils/web3Utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { cn } from "@/lib/utils";
import { CHAIN_ID } from "@/config/app.config";

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
          CHAIN_ID
        );
        // Fetch hasClaimed after connection is established
        setTimeout(async () => {
          if (signer && account) {
            const claimed = await fetchHasClaimed(account, signer, setError);
            setHasClaimed(claimed);
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
            CHAIN_ID
          );
          // Fetch hasClaimed after connection is established
          setTimeout(async () => {
            if (signer) {
              const claimed = await fetchHasClaimed(accounts[0], signer, setError);
              setHasClaimed(claimed);
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
      CHAIN_ID // Por ejemplo, si quieres que cambie a esta red
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
              {/* Balance Cards */}
              <div className="grid grid-cols-2 gap-3">
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
              </div>

              {/* Account Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Cuenta:</span>
                <span className="font-mono text-sm bg-white px-3 py-1 rounded-md border">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </span>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleClaimtokens}
                  disabled={loading || currentChainId !== CHAIN_ID || hasClaimed}
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
                      disabled={loading || currentChainId !== CHAIN_ID}
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
                      disabled={loading || currentChainId !== CHAIN_ID}
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
                  href={`https://etherscan.io/tx/${txHash}`}
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
          {currentChainId !== CHAIN_ID && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-amber-700 text-sm flex-1">
                Cambia a la red configurada (chain ID {CHAIN_ID.toString()}) para reclamar los tokens.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
