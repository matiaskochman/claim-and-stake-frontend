# Funcionalidades de Claim & Stake Tokens

## Introducción

Claim & Stake Tokens es una aplicación Web3 descentralizada que permite a los usuarios reclamar tokens ERC20 desde un faucet, stakearlos para ganar recompensas, y gestionar sus posiciones de staking. La aplicación está construida con Next.js 14, TypeScript, ethers.js, y Tailwind CSS.

---

## Contratos Desplegados (Versión 2 - BNB Testnet)

| Contrato | Dirección | Descripción |
|----------|-----------|-------------|
| **MyToken (MTK)** | `0x03Cf79CB9CAb8C63677E1E6a86C23d32b669e980` | Token ERC20 con pausabilidad |
| **Faucet** | `0xc52A4D4171AAFe14dE93ebCC3C9C47053Ce74BE7` | Contrato faucet para distribuir tokens |
| **Staking** | `0x8b858D12125B781e45FBc6D0C9474bB560d3f4E5` | Contrato de staking con recompensas |

**Fecha de despliegue:** 2026-03-31
**Red:** BNB Testnet (Chain ID: 97)

---

## Funcionalidades de Usuario

### 1. Gestión de Wallet

#### Conectar Wallet
- **Descripción:** Permite conectar una wallet Web3 (MetaMask, WalletConnect, etc.)
- **Implementación:** Web3Modal con caché de proveedor
- **Características:**
  - Auto-reconexión al recargar la página
  - Cambio automático a la red correcta (BNB Testnet)
  - Detección de cambio de cuenta

#### Desconectar Wallet
- **Descripción:** Cierra la sesión y limpia todos los estados
- **Estados limpiados:** balance, staked amount, rewards, account, provider, signer

#### Eventos de Wallet
- **accountsChanged:** Detecta cuando el usuario cambia de cuenta en su wallet
- **chainChanged:** Recarga la página cuando el usuario cambia de red

---

### 2. Claim de Tokens (Faucet)

#### Funcionalidad
- **Descripción:** Permite a los usuarios reclamar tokens una sola vez por dirección
- **Cantidad por claim:** Configurable por admin (default: 200 tokens)
- **Restricción:** Un claim por dirección

#### Estados Relacionados
- `hasClaimed`: Indica si el usuario ya reclamó sus tokens
- `balance`: Balance actual de tokens del usuario

#### Flujos
1. Usuario conecta wallet
2. Si nunca ha reclamado, el botón "Claim Tokens" está habilitado
3. Después de un claim exitoso, se muestra el indicador "Claim realizado"

---

### 3. Staking de Tokens

#### Stake Tokens
- **Descripción:** Permite a los usuarios stakear sus tokens para ganar recompensas
- **Requisitos:** Previo approval del contrato Staking
- **Proceso:**
  1. Usuario ingresa la cantidad a stakear
  2. Si es necesario, se ejecuta un approval previo
  3. Se ejecuta la transacción de stake
  4. Se actualizan los balances y recompensas

#### Unstake Tokens
- **Descripción:** Permite retirar tokens stakeados
- **Características:**
  - Retiro de tokens stakeados
  - Cálculo automático de recompensas pendientes
  - Actualización de balances

---

### 4. Visualización de Información

#### Dashboard Principal
Tres tarjetas de información en tiempo real:

| Tarjeta | Información |
|---------|-------------|
| **Tu Balance** | Cantidad de tokens disponibles en la wallet |
| **Staked** | Cantidad de tokens actualmente stakeados |
| **Recompensas** | Recompensas pendientes por reclamar |

#### Información de Stake
- **Tiempo transcurrido:** Muestra cuánto tiempo lleva staking (formateado en días/horas/minutos)
- **Fecha de inicio:** Timestamp exacto de cuándo comenzó el stake
- **Actualización automática:** Las recompensas se actualizan cada 30 segundos

#### Dirección de Cuenta
- Muestra la dirección de la wallet acortada (0x1234...5678)

---

## Funcionalidades de Administración

### Acceso al Panel de Admin

- **Requisito:** Ser owner del contrato Staking
- **Verificación:** La función `isContractOwner` verifica si la dirección conectada es el owner
- **Visibilidad:** El panel solo se muestra si `isOwner === true`

---

### 1. Controles del Contrato Staking

#### Set Reward Rate
- **Descripción:** Configura la tasa de recompensas del staking
- **Parámetros:** Tasa de recompensa (número)
- **Uso:** Define cuántos tokens se generan por unidad de tiempo

#### Pause Staking
- **Descripción:** Pausa el contrato de staking
- **Efecto:** Ningún usuario puede stakear o unstake mientras esté pausado

#### Unpause Staking
- **Descripción:** Reanuda el contrato de staking
- **Efecto:** Los usuarios pueden volver a interactuar con el contrato

---

### 2. Controles del Contrato Faucet

#### Set Claim Amount
- **Descripción:** Configura la cantidad de tokens que se entregan por claim
- **Parámetros:** Cantidad en tokens (default: 200)
- **Efecto:** Afecta a futuros claims del faucet

#### Pause Faucet
- **Descripción:** Pausa el contrato del faucet
- **Efecto:** Nadie puede reclamar tokens mientras esté pausado

#### Unpause Faucet
- **Descripción:** Reanuda el contrato del faucet
- **Efecto:** Los usuarios pueden volver a reclamar tokens

#### Reset Claim
- **Descripción:** Resetea el estado de claim de una dirección específica
- **Parámetros:** Dirección de la wallet a resetear
- **Uso:** Permite que una dirección vuelva a reclamar tokens

#### Emergency Withdraw
- **Descripción:** Retiro de emergencia de tokens del faucet
- **Parámetros:**
  - Dirección destino
  - Cantidad a retirar
- **Uso:** Para recuperar fondos en caso de emergencia

---

### 3. Controles del Contrato Token (MyToken)

#### Pause Token
- **Descripción:** Pausa el contrato del token
- **Efecto:** Todas las transferencias de tokens se bloquean

#### Unpause Token
- **Descripción:** Reanuda el contrato del token
- **Efecto:** Las transferencias de tokens se reanudan

---

## Detalles Técnicos

### Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js** | 14.2.14 | Framework React con App Router |
| **TypeScript** | - | Tipado estático |
| **ethers.js** | v6 | Interacción con la blockchain |
| **Tailwind CSS** | - | Estilos y diseño |
| **Web3Modal** | - | Conexión de wallets |
| **shadcn/ui** | - | Componentes de UI |
| **Material Symbols** | - | Iconos de Google |

---

### Configuración de Red

```typescript
// BNB Testnet
Chain ID: 97 (0x61)
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
```

### Variables de Entorno

```bash
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CHAIN_NAME="BNB Testnet"
NEXT_PUBLIC_RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545/"
NEXT_PUBLIC_TOKEN_ADDRESS=0x03Cf79CB9CAb8C63677E1E6a86C23d32b669e980
NEXT_PUBLIC_FAUCET_ADDRESS=0xc52A4D4171AAFe14dE93ebCC3C9C47053Ce74BE7
NEXT_PUBLIC_STAKING_ADDRESS=0x8b858D12125B781e45FBc6D0C9474bB560d3f4E5
```

---

## Funciones de Utilidad Web3

### Gestión de Errores
- `parseWeb3Error()`: Parsea errores de Web3 y devuelve mensajes amigables
- Manejo de rechazo de transacciones (code 4001)
- Detección de errores de red
- Mensajes específicos para revert del contrato

### Funciones de Consulta
- `fetchTokenBalance()`: Obtiene el balance de tokens
- `fetchStakedAmount()`: Obtiene la cantidad stakeada
- `fetchHasClaimed()`: Verifica si ya reclamó tokens
- `fetchPendingRewards()`: Calcula recompensas pendientes
- `fetchStakeInfo()`: Obtiene información del stake (timestamp)
- `isContractOwner()`: Verifica si es owner del contrato

### Funciones de Transacción
- `claimTokens()`: Reclama tokens del faucet
- `approveTokens()`: Aprueba el contrato de staking
- `stakeTokens()`: Stakea tokens
- `unstakeTokens()`: Retira tokens stakeados

---

## Uso de Material Symbols

La aplicación incluye Material Symbols Outlined de Google Fonts.

### Ejemplo de uso:

```tsx
<span className="material-symbols-outlined">search</span>
```

### Iconos disponibles:

Cualquier icono de [Material Symbols Outlined](https://fonts.google.com/icons) puede ser usado simplemente especificando su nombre.

---

## Estructura del Proyecto

```
token_erc20_nextjs_faucet/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout principal con favicon y Material Symbols
│   │   ├── page.tsx            # Componente principal del dashboard
│   │   └── components/
│   │       ├── WagmiClientProvider.tsx
│   │       ├── WalletOptions.tsx
│   │       ├── Profile.tsx
│   │       └── ReadContract.tsx
│   ├── components/
│   │   ├── ui/                 # Componentes shadcn/ui
│   │   └── ContractAddressRow.tsx
│   ├── config/
│   │   └── app.config.ts       # Configuración centralizada
│   ├── utils/
│   │   └── web3Utils.ts        # Funciones Web3
│   ├── abis/                   # ABIs de los contratos
│   └── lib/
│       └── utils.ts
├── public/
│   └── favicon_1.ico
└── FUNCIONALIDADES.md          # Este archivo
```

---

## Notas Importantes

1. **Auto-actualización:** Las recompensas se actualizan automáticamente cada 30 segundos
2. **Caché de wallet:** La conexión se mantiene al recargar la página
3. **Validación de red:** La app solicita cambiar a BNB Testnet si es necesario
4. **Panel admin:** Solo visible para owners verificados
5. **Estados de carga:** Todos los botones muestran estados de carga durante transacciones
6. **Manejo de errores:** Mensajes amigables en español para errores comunes

---

## Información de Despliegue

### Docker
```bash
docker compose up
```

### Desarrollo Local
```bash
npm run dev
```

### Build de Producción
```bash
npm run build
```

---

*Última actualización: 2026-03-31*
*Versión de contratos: V2*
