import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// ── Ritual Chain Testnet ──────────────────────────────────────────────────────
export const ritualTestnet = defineChain({
  id: 1979,
  name: "Ritual Chain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "RITUAL",
    symbol: "RITUAL",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RITUAL_RPC_URL || "https://rpc.ritualfoundation.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
  testnet: true,
});

// ── WalletConnect / wagmi config ──────────────────────────────────────────────
export const wagmiConfig = getDefaultConfig({
  appName: "PixelMind",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [ritualTestnet],
  ssr: true,
});
