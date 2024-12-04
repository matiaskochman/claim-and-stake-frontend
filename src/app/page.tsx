"use client";
import { useState, useEffect } from "react";
import {
  connectWallet,
  fetchTokenBalance,
  claimTokens,
  stakeTokens,
  unstakeTokens,
  logout,
} from "@/utils/web3Utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { fetchStakedAmount } from "@/utils/web3Utils";

export default function Web3TokenDashboard() {
  const [balance, setBalance] = useState<number>(0);
  // const [stakedAmount, setStakedAmount] = useState(0);
  const [stakedAmount, setStakedAmount] = useState<number>(0);

  const [stakingStart, setStakingStart] = useState<Date | null>(null);
  const [stakingRewards, setStakingRewards] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<bigint | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [unstakeAmount, setUnstakeAmount] = useState<number>(0);

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
          41337n
        );
      }
    };

    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await connectWallet(
            setProvider,
            setSigner,
            setAccount,
            setIsConnected,
            setError,
            setCurrentChainId,
            setStakedAmount,
            setBalance,
            41337n // Por ejemplo, si quieres que cambie a esta red
          );
        } else {
          handleLogout();
        }
      });

      window.ethereum.on("chainChanged", (_chainId: string) => {
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
    await claimTokens(signer, provider, setLoading, setError, setTxHash);
    if (provider && signer && account) {
      // Ahora puedes llamar a fetchTokenBalance u otras funciones que necesites
      await fetchTokenBalance(signer, account, setBalance, setError);
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
      41337n // Por ejemplo, si quieres que cambie a esta red
    );
    setLoading(false);

    if (provider && signer && account) {
      // Ahora puedes llamar a fetchTokenBalance u otras funciones que necesites
      await fetchTokenBalance(signer, account, setBalance, setError);
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
      setStakingStart,
      setStakingRewards
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
      setStakingStart
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
      setStakingStart,
      setStakingRewards,
      setCurrentChainId,
      setError,
      setTxHash
    );
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Web3 Token Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <Button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Conectando..." : "Conectar Wallet"}
            </Button>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Cuenta:</span>
                <span className="font-bold">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className="font-bold">{balance.toFixed(2)} tokens</span>
              </div>
              <div className="flex justify-between">
                <span>Staked Amount:</span>
                <span className="font-bold">
                  {stakedAmount !== undefined && !isNaN(stakedAmount)
                    ? stakedAmount.toFixed(2)
                    : "0.00"}{" "}
                  tokens
                </span>
              </div>
              {stakingStart && (
                <div className="flex justify-between">
                  <span>Staking Time:</span>
                  <span className="font-bold">
                    {formatDistanceToNow(stakingStart)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Staking Rewards:</span>
                <span className="font-bold">
                  {stakingRewards.toFixed(2)} tokens
                </span>
              </div>
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={handleClaimtokens}
                  disabled={loading || currentChainId !== 41337n}
                >
                  {loading ? "Reclamando..." : "Claim Tokens"}
                </Button>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                  placeholder="Cantidad de tokens para stake"
                  className="w-full p-2 border rounded"
                />
                <Button
                  onClick={handleStake}
                  disabled={loading || currentChainId !== 41337n}
                >
                  {loading
                    ? "Haciendo Stake..."
                    : `Stake ${stakeAmount} Tokens`}
                </Button>
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(Number(e.target.value))}
                  placeholder="Cantidad de tokens para unstake"
                  className="w-full p-2 border rounded"
                />
                <Button
                  onClick={handleUnstake}
                  disabled={loading || currentChainId !== 41337n}
                >
                  {loading
                    ? "Haciendo Unstake..."
                    : `Unstake ${unstakeAmount} Tokens`}
                </Button>
                <Button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white"
                >
                  {loading ? "Desconectando..." : "Logout"}
                </Button>
              </div>
            </>
          )}
          {txHash && (
            <div className="p-3 bg-green-100 rounded">
              <p className="text-green-800">
                Transacción enviada:{" "}
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-all"
                >
                  {txHash}
                </a>
              </p>
            </div>
          )}
          {error && (
            <p className="text-red-500" role="alert">
              {error}
            </p>
          )}
          {currentChainId !== 41337n && (
            <p className="text-orange-500" role="alert">
              Cambia a la red de Hardhat para reclamar los tokens.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
