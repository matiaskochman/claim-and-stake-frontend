#!/usr/bin/env node

// Generar .env a partir de variables de entorno del sistema
const fs = require('fs');

const envVars = [
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_CHAIN_NAME',
  'NEXT_PUBLIC_RPC_URL',
  'NEXT_PUBLIC_TOKEN_ADDRESS',
  'NEXT_PUBLIC_FAUCET_ADDRESS',
  'NEXT_PUBLIC_STAKING_ADDRESS',
];

let envContent = '';

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    envContent += `${varName}=${value}\n`;
    console.log(`✓ ${varName}=${value}`);
  } else {
    console.warn(`⚠ ${varName} no está definida`);
  }
});

if (envContent) {
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ Archivo .env generado exitosamente');
} else {
  console.error('❌ No se encontraron variables de entorno NEXT_PUBLIC_*');
  process.exit(1);
}
