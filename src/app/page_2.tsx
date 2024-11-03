"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import tokenAbi from "./abis/MyToken.json"; // ABI del token ERC-20
import faucetAbi from "./abis/Faucet.json"; // ABI del contrato faucet

export default function Web3TokenDashboard() {
  const [balance, setBalance] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
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

  useEffect(() => {
    const init = async () => {
      const web3Modal = new Web3Modal({ cacheProvider: true });
      if (web3Modal.cachedProvider) {
        await connectWallet();
      }
    };

    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length > 0) {
          console.log("Cuenta cambiada:", accounts[0]);
          setAccount(accounts[0]);
          await connectWallet(); // Reconecta al cambiar de cuenta
        } else {
          logout();
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

  useEffect(() => {
    const timer = setInterval(() => {
      if (stakingStart && stakedAmount > 0) {
        const elapsedHours =
          (Date.now() - stakingStart.getTime()) / (1000 * 60 * 60);
        const newRewards = stakedAmount * 0.01 * elapsedHours; // 1% por hora
        setStakingRewards(newRewards);
      }
    }, 1000); // Actualizar cada segundo

    return () => clearInterval(timer);
  }, [stakingStart, stakedAmount]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const web3Modal = new Web3Modal();
      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setCurrentChainId(network.chainId);
      setIsConnected(true);

      if (network.chainId !== 41337n) {
        await switchToLocalhost();
      }

      // Leer el balance del token ERC-20
      await fetchTokenBalance(signer, address);
    } catch (error: any) {
      setError("No se pudo conectar a la wallet.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenBalance = async (
    signer: ethers.JsonRpcSigner,
    address: string
  ) => {
    try {
      const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      const balance = await tokenContract.balanceOf(address);
      setBalance(Number(ethers.formatUnits(balance, 6))); // Cambiamos de 18 a 6
    } catch (err) {
      console.error("Error al obtener el balance del token:", err);
      setError("No se pudo obtener el balance del token.");
    }
  };

  const claimTokens = async () => {
    try {
      if (!signer || !provider) {
        setError("No estás conectado a ninguna wallet.");
        return;
      }

      setLoading(true);
      setError(null);

      const faucetAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const faucetContract = new ethers.Contract(
        faucetAddress,
        faucetAbi,
        signer
      );
      const tx = await faucetContract.claimTokens();
      const receipt = await tx.wait();

      console.log("Transacción enviada:", tx);
      console.log("Receipt:", receipt);

      setTxHash(tx.hash);
      await fetchTokenBalance(signer, account!); // Actualizar el balance después del claim
    } catch (err: any) {
      console.error("Error en claimTokens:", err);
      setError(err.message || "Ocurrió un error al reclamar los tokens.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAccount(null);
    setIsConnected(false);
    setTxHash(null);
    setError(null);
    setBalance(0); // Limpiar balance
    setStakedAmount(0); // Limpiar cantidad staked
    setStakingStart(null); // Limpiar tiempo de staking
    setStakingRewards(0); // Limpiar recompensas
    const web3Modal = new Web3Modal();
    web3Modal.clearCachedProvider();
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
              onClick={connectWallet}
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
                  {stakedAmount.toFixed(2)} tokens
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
                  onClick={claimTokens}
                  disabled={loading || currentChainId !== 41337n}
                >
                  {loading ? "Reclamando..." : "Claim Tokens"}
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
