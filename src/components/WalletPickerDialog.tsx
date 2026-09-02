"use client";
// components/WalletPickerDialog.tsx
// Modal de selección de wallet (EIP-6963): permite elegir entre las wallets instaladas

import { Wallet as WalletIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FALLBACK_WALLET_ICON, type WalletOption } from "@/utils/eip6963";

interface WalletPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: WalletOption[];
  isDiscovering: boolean;
  isConnecting: boolean;
  onSelect: (wallet: WalletOption) => void;
}

export function WalletPickerDialog({
  open,
  onOpenChange,
  wallets,
  isDiscovering,
  isConnecting,
  onSelect,
}: WalletPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border-0 p-5">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Conectar Wallet
          </DialogTitle>
          <DialogDescription className="text-xs">
            Seleccioná qué wallet querés usar en esta sesión
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {isDiscovering && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <svg className="animate-spin h-6 w-6 text-purple-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-gray-500">Buscando wallets instaladas...</p>
            </div>
          )}

          {!isDiscovering && wallets.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-sm text-gray-600 font-medium">No se detectaron wallets</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Instalá una wallet (MetaMask, Rabby, Trust, etc.) o abrí esta página dentro
                del navegador de tu wallet.
              </p>
            </div>
          )}

          {!isDiscovering &&
            wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                disabled={isConnecting}
                onClick={() => onSelect(wallet)}
                className="group flex items-center gap-3 w-full rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-colors p-3 text-left disabled:opacity-50 disabled:pointer-events-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wallet.icon || FALLBACK_WALLET_ICON}
                  alt={wallet.name}
                  className="w-10 h-10 rounded-lg bg-white p-1 border border-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-purple-700 transition-colors">
                    {wallet.name}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{wallet.id}</p>
                </div>
                {isConnecting && (
                  <svg className="animate-spin h-4 w-4 text-purple-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <svg
                  className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
