"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import faucetAbi from "./abis/Faucet.json";

export default function FaucetClaim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<bigint | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [nonce, setNonce] = useState<number>(0);

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

      const accountNonce = await provider.getTransactionCount(address);
      setNonce(accountNonce);

      if (network.chainId !== 41337n) {
        await switchToLocalhost();
      }
    } catch (error: any) {
      setError("No se pudo conectar a la wallet.");
    } finally {
      setLoading(false);
    }
  };

  const claimTokens = async () => {
    try {
      if (!signer || !provider) {
        setError("No estás conectado a ninguna wallet.");
        return;
      }
      const address = await signer.getAddress();
      console.log("Dirección del signer:", address);

      setLoading(true);
      setError(null);

      const faucetAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const faucetContract = new ethers.Contract(
        faucetAddress,
        faucetAbi,
        signer
      );

      // Suscribirse a los eventos del contrato
      faucetContract.on("TokensClaimed", (user, amount) => {
        console.log(
          `Tokens reclamados por: ${user}, cantidad: ${amount.toString()}`
        );
      });

      console.log("Contrato faucet conectado:", faucetContract);

      // Especifica el `nonce` manualmente
      const tx = await faucetContract.claimTokens({ nonce });
      const receipt = await tx.wait();

      console.log("receipt:", receipt);
      console.log("Eventos emitidos:", receipt.events);
      console.log("Transacción enviada:", tx);

      setTxHash(tx.hash);

      // Incrementa el `nonce` para la próxima transacción
      setNonce(nonce + 1);
    } catch (err: any) {
      console.log("Error en claimTokens:", err);
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAccount(null);
    setIsConnected(false);
    setTxHash(null);
    setError(null);
    const web3Modal = new Web3Modal();
    web3Modal.clearCachedProvider();
  };

  const switchToLocalhost = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (ethereum && ethereum.isMetaMask) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x7A69",
              chainName: "Hardhat Localhost",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["http://127.0.0.1:8545"],
              blockExplorerUrls: [],
            },
          ],
        });
      } else {
        setError("MetaMask no está disponible.");
      }
    } catch (err) {
      setError("No se pudo cambiar a la red de Hardhat.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Claim de Faucet</h1>
        <p className="mb-4 text-gray-600 text-center">
          Haz clic en el botón para reclamar tokens del faucet en la red de
          Hardhat.
        </p>
        {!isConnected ? (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
            aria-live="polite"
          >
            {loading ? "Conectando..." : "Conectar Wallet"}
          </button>
        ) : (
          <>
            <button
              onClick={claimTokens}
              disabled={loading || currentChainId !== 41337n}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
              aria-live="polite"
            >
              {loading ? "Reclamando..." : "Claim"}
            </button>
            <button
              onClick={logout}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
              aria-live="polite"
            >
              Logout
            </button>
          </>
        )}
        {txHash && (
          <div className="mt-4 p-3 bg-green-100 rounded">
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
          <p className="mt-4 text-red-500" role="alert">
            {error}
          </p>
        )}
        {currentChainId !== 41337n && (
          <p className="mt-4 text-orange-500" role="alert">
            Cambia a la red de Hardhat para reclamar los tokens.
          </p>
        )}
      </div>
    </div>
  );
}
