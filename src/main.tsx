import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.global = window;
  window.Buffer = Buffer;
}
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@mysten/dapp-kit/dist/index.css";
import { WagmiProvider } from "wagmi";
import { baseSepolia, base } from "@reown/appkit/networks"; // Import from Reown
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import "./index.css";
import { App } from "./App";
import { queryClient } from "./api/queryClient";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;
if (!projectId) throw new Error("Missing VITE_REOWN_PROJECT_ID");

const networksTestnet = [baseSepolia];
const networksMainnet = [base];
const networks =
  import.meta.env.VITE_MODE === "production"
    ? networksMainnet
    : networksTestnet;

// Create Adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
});

// Initialize Modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "XPoll App",
    description: "XPoll App",
    url: import.meta.env.VITE_CLIENT_URL,
    icons: [],
  },
  themeMode: "dark",
  features: {
    analytics: true,
  },
});

const app = createRoot(document.getElementById("root")!);

app.render(
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
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
