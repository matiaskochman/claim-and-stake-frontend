/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
// utils/web3Utils.ts

import { ethers } from "ethers";
import Web3Modal from "web3modal";
import tokenAbi from "../../src/abis/MyToken.json";
import faucetAbi from "../../src/abis/Faucet.json";
import stakingAbi from "../../src/abis/Staking.json";
import { contracts } from "@/config/app.config";

// Error codes
const ACTION_REJECTED = 0x4001; // 4001 - User rejected transaction
const USER_DENIED = "ethers-user-denied";

interface ParsedError {
  message: string | null;
  cancelled: boolean;
}

/**
 * Extrae el mensaje de error de múltiples ubicaciones en el objeto de error
 */
const extractErrorReason = (err: any): string | null => {
  // Prioridad 1: err.reason (directo del contrato)
  if (err.reason) return err.reason;

  // Prioridad 2: err.revert?.args[0] (custom errors)
  if (err.revert?.args?.[0]) return err.revert.args[0];

  // Prioridad 3: err.data (datos codificados del error)
  if (err.data) {
    // Si es un string con el mensaje de revert
    if (typeof err.data === 'string' && err.data.startsWith('0x08c379a0')) {
      // Error(string) selector - intentar decodificar
      try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ['string'],
          ethers.dataSlice(err.data, 4)
        );
        if (decoded[0]) return decoded[0];
      } catch {
        // Fallar silenciosamente si no se puede decodificar
      }
    }

    // Si contiene el selector de un custom error conocido
    // AlreadyClaimed() selector = 0x...
    // InsufficientStake() selector = 0x...
  }

  // Prioridad 4: err.message
  if (err.message) return err.message;

  // Prioridad 5: err.error?.message
  if (err.error?.message) return err.error.message;

  return null;
};

/**
 * Patrones de error conocidos con sus mensajes amigables
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // Already claimed / Ya reclamaste
  { pattern: /AlreadyClaimed|Already claimed|Ya reclamaste|already claimed/i, message: "Ya has reclamado tus tokens anteriormente." },

  // Insufficient balance / Balance insuficiente
  { pattern: /ERC20InsufficientBalance|InsufficientBalance|insufficient balance|balance insuficiente/i, message: "No tienes suficientes tokens para esta operación." },

  // Insufficient allowance / Allowance insuficiente
  { pattern: /ERC20InsufficientAllowance|insufficient allowance|allowance insuficiente/i, message: "Primero debes aprobar los tokens para esta operación." },

  // Paused / Pausado
  { pattern: /EnforcedPause|Pausado|paused|contract paused/i, message: "El contrato está pausado temporalmente." },

  // Not owner / No es owner
  { pattern: /OwnableUnauthorizedAccount|NotOwner|not owner|no eres owner|unauthorized account/i, message: "No tienes permisos para realizar esta operación." },

  // Insufficient stake / Stake insuficiente
  { pattern: /InsufficientStake|insufficient stake|stake insuficiente/i, message: "No tienes suficientes tokens apostados para esta operación." },

  // Zero amount / Monto cero
  { pattern: /ZeroAmount|zero amount|monto cero|amount must be greater/i, message: "El monto debe ser mayor a cero." },

  // Reward exceeds maximum / Recompensa excede máximo
  { pattern: /RewardExceedsMaximum|reward exceeds|recompensa excede/i, message: "La recompensa excede el máximo permitido." },

  // Invalid address / Dirección inválida
  { pattern: /InvalidAddress|invalid address|dirección inválida/i, message: "La dirección proporcionada no es válida." },

  // Amount exceeds balance / Monto excede balance
  { pattern: /AmountExceedsBalance|amount exceeds|monto excede/i, message: "El monto excede tu balance disponible." },
];

/**
 * Parsea errores de Web3 y devuelve un objeto con mensaje y estado de cancelación
 */
export const parseWeb3Error = (err: any): ParsedError => {
  // Usuario rechazó la transacción
  if (
    err.code === ACTION_REJECTED ||
    err?.info?.error?.code === ACTION_REJECTED ||
    err.message?.includes(USER_DENIED) ||
    err.code === 4001
  ) {
    return { message: null, cancelled: true };
  }

  // Error de red - cambiar de red
  if (err.code === 4902 || err.code === -32603) {
    if (err.message?.includes("chain") || err.message?.includes("network")) {
      return { message: "Error de red. Por favor verifica que estás en la red correcta.", cancelled: false };
    }
  }

  // Extraer el mensaje de error
  const errorReason = extractErrorReason(err);

  if (!errorReason) {
    return { message: "Ocurrió un error inesperado. Por favor intenta nuevamente.", cancelled: false };
  }

  // Buscar coincidencia con patrones conocidos
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorReason)) {
      return { message, cancelled: false };
    }
  }

  // Si no hay coincidencia, devolver el mensaje original (limpiado)
  const cleanedMessage = errorReason
    .replace(/Error: /gi, '')
    .replace(/execution reverted: /gi, '')
    .replace(/"/g, '')
    .trim();

  return { message: cleanedMessage || "Ocurrió un error inesperado.", cancelled: false };
};

// Contract addresses from config
const { staking: stakingAddress, token: tokenAddress, faucet: faucetAddress } = contracts;

export const connectWallet = async (
  setProvider: (provider: ethers.BrowserProvider | null) => void,
  setSigner: (signer: ethers.JsonRpcSigner | null) => void,
  setAccount: (account: string | null) => void,
  setIsConnected: (isConnected: boolean) => void,
  setError: (error: string | null) => void,
  setCurrentChainId: (chain: bigint | null) => void,
  setStakedAmount: (amount: number) => void,
  setBalance: (balance: number) => void,
  desiredChainId: bigint
) => {
  try {
    console.log("connectWallet");
    const web3Modal = new Web3Modal();
    const instance = await web3Modal.connect();
    const provider = new ethers.BrowserProvider(instance);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    // Si se especifica un chainId deseado y es diferente al actual, intentar cambiar de red
    if (desiredChainId && network.chainId !== desiredChainId) {
      try {
        const chainId = `0x${desiredChainId.toString(16)}`;
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
        setCurrentChainId(BigInt(chainId));
      } catch (switchError: any) {
        console.error("Error al cambiar de red:", switchError);
        setError("No se pudo cambiar a la red deseada.");
        return;
      }
    }
    setCurrentChainId(BigInt(desiredChainId));
    setProvider(provider);
    setSigner(signer);
    setAccount(address);
    setIsConnected(true);
    setError(null);
    await fetchTokenBalance(signer, address, setBalance, setError);
    const stakedAmount = await fetchStakedAmount(address, signer, setError);
    setStakedAmount(stakedAmount);
    // await fetchStakedAmount()
  } catch (error: any) {
    const errorMsg = parseWeb3Error(error);
    if (errorMsg.message) {
      setError(errorMsg.message);
    }
  }
};

// Función para obtener el balance del token
export const fetchTokenBalance = async (
  signer: ethers.JsonRpcSigner,
  address: string,
  setBalance: Function,
  setError: Function
) => {
  try {
    console.log("fetchTokenBalance");

    const tokenContract = new ethers.Contract(
      tokenAddress,
      tokenAbi.abi,
      signer
    );
    const balance = await tokenContract.balanceOf(address);
    console.log("balance: ", balance);
    setBalance(parseFloat(ethers.formatUnits(balance, 6)));
  } catch (err) {
    console.error("Error al obtener el balance del token:", err);
    setError("No se pudo obtener el balance del token.");
  }
};

export const fetchStakedAmount = async (
  address: string,
  signer: ethers.JsonRpcSigner,
  setError: (message: string) => void
): Promise<number> => {
  try {
    console.log("fetchStakedAmount");
    if (!ethers.isAddress(address)) {
      throw new Error("Dirección inválida.");
    }

    const stakingContract = new ethers.Contract(
      stakingAddress,
      stakingAbi.abi,
      signer
    );

    const stakedAmount = await stakingContract.getStakedAmount(address);

    // Convertir el monto a un número flotante con 6 decimales
    const staked = parseFloat(ethers.formatUnits(stakedAmount, 6));
    return staked;
  } catch (err) {
    console.error("Error al obtener el monto staked:", err);
    setError("No se pudo obtener el monto staked.");
    return 0; // Devuelve 0 como valor seguro en caso de error
  }
};

// Función para reclamar tokens
export const claimTokens = async (
  signer: ethers.JsonRpcSigner | null,
  provider: ethers.BrowserProvider | null,
  setLoading: Function,
  setError: Function,
  setTxHash: Function,
  setCancelled?: (cancelled: boolean) => void
  // fetchTokenBalance: Function,
  // account: string | null,
  // setBalance: Function
) => {
  console.log("claimTokens");
  if (!signer || !provider) {
    setError("No estás conectado a ninguna wallet.");
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );
    const tx = await faucetContract.claimTokens();
    const receipt = await tx.wait();

    console.log("Transacción enviada:", tx);
    console.log("Receipt:", receipt);

    setTxHash(tx.hash);
    // await fetchTokenBalance(signer, account, setBalance, setError);
  } catch (err: any) {
    console.error("Error en claimTokens:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
    if (parsed.cancelled && setCancelled) {
      setCancelled(true);
      setTimeout(() => setCancelled(false), 2000);
    }
  } finally {
    setLoading(false);
  }
};

// Función para aprobar tokens
export const approveTokens = async (
  amount: number,
  tokenAddress: string,
  spenderAddress: string,
  signer: ethers.JsonRpcSigner
) => {
  console.log("approveTokens");
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi.abi, signer);
  const tx = await tokenContract.approve(
    spenderAddress,
    ethers.parseUnits(amount.toString(), 6)
  );
  await tx.wait();
  console.log("Tokens aprobados:", tx);
};

// Función para hacer stake de tokens
export const stakeTokens = async (
  signer: ethers.JsonRpcSigner | null,
  provider: ethers.BrowserProvider | null,
  amount: number,
  setLoading: Function,
  setError: Function,
  setTxHash: Function,
  setStakedAmount: Function,
  setStakingStart: Function,
  setCancelled?: (cancelled: boolean) => void
) => {
  console.log("stakeTokens");
  if (!signer || !provider) {
    setError("No estás conectado a ninguna wallet.");
    return;
  }

  const stakingContract = new ethers.Contract(
    contracts.staking,
    stakingAbi.abi,
    signer
  );
  const amountInTokens = ethers.parseUnits(amount.toString(), 6);

  try {
    setLoading(true);
    setError(null);

    await approveTokens(
      amount,
      contracts.token,
      contracts.staking,
      signer
    );
    const tx = await stakingContract.stake(amountInTokens);
    const receipt = await tx.wait();

    console.log("Transacción enviada:", tx);
    console.log("Receipt:", receipt);

    setTxHash(tx.hash);
    setStakedAmount((prev: number) => prev + amount);
    setStakingStart(new Date());
  } catch (err: any) {
    console.error("Error en stakeTokens:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
    if (parsed.cancelled && setCancelled) {
      setCancelled(true);
      setTimeout(() => setCancelled(false), 2000);
    }
  } finally {
    setLoading(false);
  }
};

// Función para hacer unstake de tokens

export const unstakeTokens = async (
  signer: ethers.JsonRpcSigner | null,
  provider: ethers.BrowserProvider | null,
  amount: number,
  setLoading: Function,
  setError: Function,
  setTxHash: Function,
  setStakedAmount: Function,
  setStakingStart: Function,
  setStakingRewards: Function,
  setCancelled?: (cancelled: boolean) => void
) => {
  console.log("Iniciando proceso de unstakeTokens...");
  if (!signer || !provider) {
    setError("No estás conectado a ninguna wallet.");
    return;
  }

  const stakingContract = new ethers.Contract(
    stakingAddress,
    stakingAbi.abi,
    signer
  );

  try {
    setLoading(true);
    setError(null);

    // Obtener la dirección del usuario
    const userAddress = await signer.getAddress();
    console.log("Dirección del usuario:", userAddress);

    // Consultar el stakedAmount desde el contrato
    const stakedAmountBigNumber: bigint = await stakingContract.getStakedAmount(
      userAddress
    );
    console.log(
      "Monto staked actual (en wei):",
      stakedAmountBigNumber.toString()
    );

    const stakedAmount = parseFloat(
      ethers.formatUnits(stakedAmountBigNumber, 6)
    );
    console.log("Monto staked actual (formateado):", stakedAmount);

    console.log(`Intentando hacer unstake de ${amount} tokens.`);

    // Verificar el balance del contrato de staking
    const stakingContractBalance = await checkStakingContractBalance(
      signer,
      setError
    );
    console.log(
      "Balance del contrato de staking disponible:",
      stakingContractBalance
    );

    // Validar que el usuario tiene suficiente stakedAmount para hacer unstake
    if (amount > stakedAmount) {
      setError(
        "No tienes suficientes tokens apostados para realizar esta operación."
      );
      setLoading(false);
      return;
    }

    const valueToUnstake = ethers.parseUnits(amount.toString(), 6);
    console.log("Cantidad a desapostar (en wei):", valueToUnstake.toString());

    // Realizar la transacción de unstake
    const tx = await stakingContract.unstake(valueToUnstake);
    const receipt = await tx.wait();

    console.log("Transacción enviada:", tx);
    console.log("Receipt:", receipt);

    setTxHash(tx.hash);
    setStakedAmount((prev: number) => prev - amount);

    // Si el usuario ha desapostado todo, restablecer los estados relacionados
    if (amount >= stakedAmount) {
      setStakingStart(null);
      setStakingRewards(0);
    }
  } catch (err: any) {
    console.error("Error en unstakeTokens:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
    if (parsed.cancelled && setCancelled) {
      setCancelled(true);
      setTimeout(() => setCancelled(false), 2000);
    }
  } finally {
    setLoading(false);
  }
};
export const fetchHasClaimed = async (
  address: string,
  signer: ethers.JsonRpcSigner,
  setError: (message: string) => void
): Promise<boolean> => {
  try {
    console.log("fetchHasClaimed");
    if (!ethers.isAddress(address)) {
      throw new Error("Dirección inválida.");
    }

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );

    const hasClaimed = await faucetContract.hasClaimed(address);
    console.log("hasClaimed:", hasClaimed);
    return hasClaimed;
  } catch (err) {
    console.error("Error al verificar si ya reclamó:", err);
    setError("No se pudo verificar el estado del claim.");
    return false; // Devuelve false como valor seguro en caso de error
  }
};

export const checkStakingContractBalance = async (
  signer: ethers.JsonRpcSigner,
  setError: Function
) => {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      tokenAbi.abi,
      signer
    );
    const stakingBalance = await tokenContract.balanceOf(stakingAddress);
    console.log(
      "Balance del contrato de staking (en wei):",
      stakingBalance.toString()
    );

    const stakingBalanceFormatted = parseFloat(
      ethers.formatUnits(stakingBalance, 6)
    );
    console.log(
      "Balance del contrato de staking (formateado):",
      stakingBalanceFormatted
    );

    return stakingBalanceFormatted;
  } catch (err) {
    console.error("Error al obtener el balance del contrato de staking:", err);
    setError("No se pudo obtener el balance del contrato de staking.");
    return 0;
  }
};

/**
 * Obtiene las recompensas pendientes de un usuario
 * @param address Dirección del usuario
 * @param signer Signer de ethers
 * @returns Monto de recompensas pendientes formateado con 6 decimales
 */
export const fetchPendingRewards = async (
  address: string,
  signer: ethers.JsonRpcSigner
): Promise<number> => {
  try {
    console.log("fetchPendingRewards");
    if (!ethers.isAddress(address)) {
      throw new Error("Dirección inválida.");
    }

    const stakingContract = new ethers.Contract(
      stakingAddress,
      stakingAbi.abi,
      signer
    );

    const rewards = await stakingContract.calculateReward(address);
    const rewardsFormatted = parseFloat(ethers.formatUnits(rewards, 6));
    console.log("Recompensas pendientes:", rewardsFormatted);
    return rewardsFormatted;
  } catch (err) {
    console.error("Error al obtener recompensas pendientes:", err);
    return 0;
  }
};

/**
 * Obtiene información completa del stake de un usuario
 * @param address Dirección del usuario
 * @param signer Signer de ethers
 * @returns Objeto con amount (número) y since (timestamp bigint)
 */
export const fetchStakeInfo = async (
  address: string,
  signer: ethers.JsonRpcSigner
): Promise<{ amount: number; since: bigint }> => {
  try {
    console.log("fetchStakeInfo");
    if (!ethers.isAddress(address)) {
      throw new Error("Dirección inválida.");
    }

    const stakingContract = new ethers.Contract(
      stakingAddress,
      stakingAbi.abi,
      signer
    );

    const stakeInfo = await stakingContract.getStakeInfo(address);
    const amountFormatted = parseFloat(ethers.formatUnits(stakeInfo.amount, 6));
    console.log("StakeInfo:", { amount: amountFormatted, since: stakeInfo.since.toString() });
    return {
      amount: amountFormatted,
      since: stakeInfo.since
    };
  } catch (err) {
    console.error("Error al obtener información del stake:", err);
    return { amount: 0, since: 0n };
  }
};

// ============================================================================
// FUNCIONES DE ADMINISTRACIÓN
// ============================================================================

/**
 * Verifica si la dirección conectada es owner de un contrato
 * @param contractAddress Dirección del contrato a verificar
 * @param signer Signer de ethers
 * @returns true si es owner, false en caso contrario
 */
export const isContractOwner = async (
  contractAddress: string,
  signer: ethers.JsonRpcSigner
): Promise<boolean> => {
  try {
    console.log("🔍 Verificando owner del contrato:", contractAddress);
    const contract = new ethers.Contract(
      contractAddress,
      ["function owner() view returns (address)"],
      signer
    );
    const ownerAddress = await contract.owner();
    console.log("👑 Owner del contrato:", ownerAddress);
    const currentAddress = await signer.getAddress();
    console.log("👤 Tu dirección:", currentAddress);
    const isOwner = ownerAddress.toLowerCase() === currentAddress.toLowerCase();
    console.log("✅ ¿Eres owner?", isOwner);
    return isOwner;
  } catch (err) {
    console.error("❌ Error al verificar owner:", err);
    return false;
  }
};

// ------------------- STAKING ADMIN -------------------

export const setRewardRate = async (
  rate: number,
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const stakingContract = new ethers.Contract(
      stakingAddress,
      stakingAbi.abi,
      signer
    );

    const tx = await stakingContract.setRewardRate(rate);
    await tx.wait();

    console.log("Reward rate actualizado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en setRewardRate:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const pauseStaking = async (
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const stakingContract = new ethers.Contract(
      stakingAddress,
      stakingAbi.abi,
      signer
    );

    const tx = await stakingContract.pause();
    await tx.wait();

    console.log("Staking pausado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en pauseStaking:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const unpauseStaking = async (
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const stakingContract = new ethers.Contract(
      stakingAddress,
      stakingAbi.abi,
      signer
    );

    const tx = await stakingContract.unpause();
    await tx.wait();

    console.log("Staking despausado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en unpauseStaking:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

// ------------------- FAUCET ADMIN -------------------

export const setClaimAmount = async (
  amount: number,
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );

    const amountInTokens = ethers.parseUnits(amount.toString(), 6);
    const tx = await faucetContract.setClaimAmount(amountInTokens);
    await tx.wait();

    console.log("Claim amount actualizado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en setClaimAmount:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const pauseFaucet = async (
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );

    const tx = await faucetContract.pause();
    await tx.wait();

    console.log("Faucet pausado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en pauseFaucet:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const unpauseFaucet = async (
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );

    const tx = await faucetContract.unpause();
    await tx.wait();

    console.log("Faucet despausado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en unpauseFaucet:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const resetClaim = async (
  userAddress: string,
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );

    const tx = await faucetContract.resetClaim(userAddress);
    await tx.wait();

    console.log("Claim reseteado para:", userAddress);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en resetClaim:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const emergencyWithdraw = async (
  to: string,
  amount: number,
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const faucetContract = new ethers.Contract(
      faucetAddress,
      faucetAbi.abi,
      signer
    );

    const amountInTokens = ethers.parseUnits(amount.toString(), 6);
    const tx = await faucetContract.emergencyWithdraw(to, amountInTokens);
    await tx.wait();

    console.log("Emergency withdraw realizado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en emergencyWithdraw:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

// ------------------- TOKEN ADMIN -------------------

export const pauseToken = async (
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const tokenContract = new ethers.Contract(
      tokenAddress,
      tokenAbi.abi,
      signer
    );

    const tx = await tokenContract.pause();
    await tx.wait();

    console.log("Token pausado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en pauseToken:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

export const unpauseToken = async (
  signer: ethers.JsonRpcSigner,
  setLoading: Function,
  setError: Function,
  setTxHash: Function
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const tokenContract = new ethers.Contract(
      tokenAddress,
      tokenAbi.abi,
      signer
    );

    const tx = await tokenContract.unpause();
    await tx.wait();

    console.log("Token despausado:", tx);
    setTxHash(tx.hash);
  } catch (err: any) {
    console.error("Error en unpauseToken:", err);
    const parsed = parseWeb3Error(err);
    if (parsed.message) {
      setError(parsed.message);
    }
  } finally {
    setLoading(false);
  }
};

// ============================================================================
// FIN FUNCIONES DE ADMINISTRACIÓN
// ============================================================================

// Función para desconectar la wallet
export const logout = (
  setAccount: Function,
  setProvider: Function,
  setSigner: Function,
  setIsConnected: Function,
  setBalance: Function,
  setStakedAmount: Function,
  setStakingStart: Function,
  setStakingRewards: Function,
  setCurrentChainId: Function,
  setError: Function,
  setTxHash: Function
) => {
  setAccount(null);
  setProvider(null);
  setSigner(null);
  setIsConnected(false);
  setBalance(0);
  setStakedAmount(0);
  setStakingStart(null);
  setStakingRewards(0);
  setCurrentChainId(null);
  setError(null);
  setTxHash(null);
};
