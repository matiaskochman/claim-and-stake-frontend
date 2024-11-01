"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import faucetAbi from "./abis/Faucet.json";
import tokenAbi from "./abis/MyToken.json";

export default function FaucetClaim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const ethereum = (window as any).ethereum;

        if (ethereum && ethereum.isMetaMask) {
          console.log("Verificando red actual...");
          const provider = new ethers.providers.Web3Provider(ethereum);
          console.log("Provider disponible:", provider);

          const network = await provider.getNetwork();
          const chainId = network.chainId;
          console.log("Red detectada:", chainId);
          setCurrentChainId(chainId);

          if (chainId !== 31337) {
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

    // Escuchar los cambios de cuenta en MetaMask
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length > 0) {
          console.log("Cuenta cambiada:", accounts[0]);
          const provider = new ethers.providers.Web3Provider(ethereum);
          const newSigner = provider.getSigner();
          setAccount(accounts[0]); // Actualiza la cuenta
        } else {
          // Si no hay cuentas disponibles, desconectamos
          logout();
        }
      });
    }

    return () => {
      // Limpiar el listener cuando el componente se desmonta
      if (ethereum) {
        ethereum.removeListener("accountsChanged", () => {});
      }
    };
  }, []);
  const claimTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Iniciando proceso de claim...");

      const ethereum = (window as any).ethereum;

      // Verificar si MetaMask está instalada y disponible
      if (ethereum && ethereum.isMetaMask) {
        console.log("MetaMask detectada.");

        // Solicitar acceso a la cuenta de MetaMask
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        const currentAccount = accounts[0];
        console.log("Cuenta conectada:", currentAccount);

        // Crear proveedor de ethers.js para MetaMask
        const provider = new ethers.providers.Web3Provider(ethereum);
        console.log("Provider creado:", provider);

        const signer = provider.getSigner();
        console.log("Signer creado:", signer);

        const network = await provider.getNetwork();
        const chainId = network.chainId;
        console.log("Red actual (chainId):", chainId);

        if (chainId !== 31337) {
          // Cambiar si es necesario
          console.log("Red incorrecta, cambiando a Hardhat localhost...");
          await switchToLocalhost();
        }

        const faucetAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Cambia por la dirección real del contrato

        const faucetContract = new ethers.Contract(
          faucetAddress,
          faucetAbi,
          signer
        );
        const tokenContract = new ethers.Contract(
          faucetAddress,
          tokenAbi,
          signer
        );

        // Suscribirse a los eventos del contrato
        faucetContract.on("TokensClaimed", (user, amount) => {
          console.log(
            `Tokens reclamados por: ${user}, cantidad: ${amount.toString()}`
          );
        });

        // Suscribirse al evento "Mint" del contrato MyToken
        tokenContract.on("Mint", (to, amount) => {
          console.log(
            `Tokens minteados a ${to} por un total de ${amount.toString()}`
          );
        });

        console.log("Contrato faucet conectado:", faucetContract);
        const address = await signer.getAddress();
        setAccount(address); // Guardar la dirección de la cuenta conectada
        setIsConnected(true); // Cambiar el estado a "conectado"

        // Obtener el nonce
        // const nonce = await provider.getTransactionCount(address, "latest");

        const tx = await faucetContract.claimTokens();
        const receipt = await tx.wait();

        console.log("Eventos emitidos:", receipt.events);
        console.log("Transacción enviada:", tx);

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

  const logout = () => {
    console.log("Desconectando MetaMask...");
    setAccount(null); // Limpiar la cuenta conectada
    setIsConnected(false); // Cambiar el estado a "desconectado"
    setTxHash(null); // Limpiar hash de transacción si existe
    setError(null); // Limpiar cualquier error
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
            onClick={claimTokens}
            disabled={loading || currentChainId !== 31337}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
            aria-live="polite"
          >
            {loading ? "Reclamando..." : "Claim"}
          </button>
        ) : (
          <button
            onClick={logout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            aria-live="polite"
          >
            Logout
          </button>
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
        {currentChainId !== 31337 && (
          <p className="mt-4 text-orange-500" role="alert">
            Cambia a la red de Hardhat para reclamar los tokens.
          </p>
        )}
      </div>
    </div>
  );
}
