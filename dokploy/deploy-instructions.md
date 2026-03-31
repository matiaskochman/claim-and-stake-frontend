# Dokploy Deployment Instructions

## Problema: Contratos viejos en producción

Si ves direcciones de contratos incorrectas en Dokploy (ej: `0x5B38Da6a...` en lugar de `0x03Cf79...`), es porque el build está usando caché antiguo.

## Solución Inmediata: Configurar Build Args

En Next.js, las variables `NEXT_PUBLIC_*` se incrustan durante el **build time**, no en runtime. Debes pasarlas como build arguments.

### Pasos en Dokploy:

1. **Ve a tu proyecto/servicio en Dokploy**

2. **En la configuración del servicio, busca la sección "Build Args"** (o "Docker Build Arguments")

3. **Añade estos Build Args:**

   ```
   NEXT_PUBLIC_CHAIN_ID=97
   NEXT_PUBLIC_CHAIN_NAME="BNB Testnet"
   NEXT_PUBLIC_RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545/"
   NEXT_PUBLIC_TOKEN_ADDRESS=0x03Cf79CB9CAb8C63677E1E6a86C23d32b669e980
   NEXT_PUBLIC_FAUCET_ADDRESS=0xc52A4D4171AAFe14dE93ebCC3C9C47053Ce74BE7
   NEXT_PUBLIC_STAKING_ADDRESS=0x8b858D12125B781e45FBc6D0C9474bB560d3f4E5
   ```

4. **Activa "No cache" o usa --no-cache** en las opciones de build para forzar un rebuild limpio

5. **Redespliega la aplicación**

## Verificación

Después del redeploy, verifica que las direcciones sean correctas:
- Token: `0x03Cf79CB9CAb8C63677E1E6a86C23d32b669e980`
- Faucet: `0xc52A4D4171AAFe14dE93ebCC3C9C47053Ce74BE7`
- Staking: `0x8b858D12125B781e45FBc6D0C9474bB560d3f4E5`

## Solución Largo Plazo

La aplicación ahora soporta **runtime config** via `public/config/contracts.json`. Esto permite actualizar las direcciones sin redeployar:

1. Edita `public/config/contracts.json` con las nuevas direcciones
2. Haz commit y push
3. Los cambios se reflejan automáticamente (no requiere rebuild)

## Build Args vs Runtime Variables

| Tipo | Cuándo se evalúa | Requiere redeploy |
|------|------------------|-------------------|
| `NEXT_PUBLIC_*` (build args) | Build time | Sí |
| `public/config/*.json` | Runtime | No |
| Variables de entorno normales | Runtime | No |

Para datos que cambian frecuentemente (direcciones de contratos), usa el archivo JSON en `public/config/`.
