import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { queryClient } from "./api/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@mysten/dapp-kit/dist/index.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const app = createRoot(document.getElementById("root")!);
const wagmiConfig = createConfig({
  chains: [baseSepolia], // 👈 This strictly limits the app to Base Sepolia
  connectors: [
    injected(), // Supports MetaMask, Rabin, etc.
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});
app.render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <SuiClientProvider
            networks={{
              mainnet: { url: getFullnodeUrl("mainnet") },
              testnet: { url: getFullnodeUrl("testnet") },
              devnet: { url: getFullnodeUrl("devnet") },
            }}
            defaultNetwork={import.meta.env.VITE_SUI_NETWORK}
          >
            <WalletProvider autoConnect>
              <Toaster />
              <App />
            </WalletProvider>
          </SuiClientProvider>
        </ThemeProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </WagmiProvider>
);
