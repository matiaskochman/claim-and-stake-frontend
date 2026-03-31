import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { WagmiClientProvider } from "./components/WagmiClientProvider";
import { serverConfig } from "@/config/app.config";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { WagmiProvider } from "wagmi";
// import { config } from "../config";

// Log de configuración al inicio (server-side)
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                    🚀 APP INITIALIZING                           ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log('║  📋 CONTRACT ADDRESSES                                            ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log(`║  🪙 Token:    ${serverConfig.contracts.token} ║`);
console.log(`║  💰 Faucet:   ${serverConfig.contracts.faucet} ║`);
console.log(`║  📊 Staking:  ${serverConfig.contracts.staking} ║`);
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log('║  ⛓️  CHAIN CONFIG                                                  ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log(`║  Name:      ${serverConfig.chain.name.padEnd(54)} ║`);
console.log(`║  Chain ID:  ${serverConfig.chain.id.toString().padEnd(54)} ║`);
console.log(`║  RPC:       ${serverConfig.chain.rpcUrl.padEnd(54)} ║`);
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log('');

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Claim & Stake Tokens",
  description: "Reclama y stakea tus tokens en la blockchain",
  icons: {
    icon: "/favicon_1.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WagmiClientProvider>{children}</WagmiClientProvider>
      </body>
    </html>
  );
}
