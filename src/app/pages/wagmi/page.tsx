"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Profile } from "@/app/components/Profile";
import { WalletOptions } from "@/app/components/WalletOptions";
// import { ReadContract } from "@/app/components/ReadContract";
import { useAccount, useEnsName } from "wagmi";

export default function FaucetClaim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<bigint | null>(null);

  const claimTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Iniciando proceso de claim...");

      const ethereum = (window as any).ethereum;

      if (ethereum && ethereum.isMetaMask) {
        console.log("MetaMask detectada.");
        const provider = new ethers.BrowserProvider(ethereum);
        console.log("Provider creado:", provider);

        const signer = await provider.getSigner();
        console.log("Signer creado:", signer);

        const network = await provider.getNetwork();
        const chainId = network.chainId;
        console.log("Red actual (chainId):", chainId);

        if (chainId !== BigInt(31337)) {
          console.log("Red incorrecta, cambiando a Hardhat localhost...");
          await switchToLocalhost();
        }

        const faucetAddress = "0xTuDireccionDelFaucet"; // Cambia por la dirección real del contrato
        const abi = ["function claim() public"];

        const faucetContract = new ethers.Contract(faucetAddress, abi, signer);
        console.log("Contrato faucet conectado:", faucetContract);

        const tx = await faucetContract.claim();
        console.log("Transacción enviada:", tx);

        await tx.wait();
        console.log("Transacción confirmada.");

        setTxHash(tx.hash);
      } else {
        console.log("MetaMask no detectada o no es MetaMask.");
        setError("MetaMask no está instalada o no es la billetera activa.");
      }
    } catch (err: any) {
      console.log("Error en claimTokens:", err);
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  const switchToLocalhost = async () => {
    try {
      const ethereum = (window as any).ethereum;

      if (ethereum && ethereum.isMetaMask) {
        console.log("Solicitando cambio a Hardhat localhost...");
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
        console.log("Red cambiada a Hardhat localhost.");
      } else {
        console.log("MetaMask no está disponible.");
        setError("MetaMask no está disponible.");
      }
    } catch (err) {
      console.log("Error en switchToLocalhost:", err);
      setError("No se pudo cambiar a la red de Hardhat.");
    }
  };

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const ethereum = (window as any).ethereum;

        if (ethereum && ethereum.isMetaMask) {
          console.log("Verificando red actual...");
          const provider = new ethers.BrowserProvider(ethereum);
          console.log("Provider disponible:", provider);

          const network = await provider.getNetwork();
          const chainId = network.chainId;
          console.log("Red detectada:", chainId);
          setCurrentChainId(chainId);

          if (chainId !== BigInt(31337)) {
            console.log("Red incorrecta, cambiando a Hardhat...");
            await switchToLocalhost();
          }
        } else {
          console.log("MetaMask no detectada.");
          setError("MetaMask no está disponible.");
        }
      } catch (err) {
        console.log("Error en checkNetwork:", err);
        setError("Error al verificar la red.");
      }
    };
    checkNetwork();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Claim de Faucet</h1>
        <p className="mb-4 text-gray-600 text-center">
          Haz clic en el botón para reclamar tokens del faucet en la red de
          Hardhat.
        </p>
        <button
          onClick={claimTokens}
          disabled={loading || currentChainId !== BigInt(31337)}
          className="w-full bg-green-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          aria-live="polite"
        >
          {loading ? "Reclamando..." : "Claim"}
        </button>
        {error && (
          <p className="mt-4 text-red-500" role="alert">
            {error}
          </p>
        )}
        {currentChainId !== BigInt(31337) && (
          <p className="mt-4 text-orange-500" role="alert">
            Cambia a la red de Hardhat para reclamar los tokens.
          </p>
        )}
      </div>
      <div>
        <Profile />
        <WalletOptions />
        {/* <ReadContract /> */}
      </div>
    </div>
  );
}
