import { useCallback, useEffect, useState } from "react";
import {
  useWallets,
  useConnectWallet,
  useDisconnectWallet,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { Button } from "../ui/button";

type ConnState = {
  connecting: boolean;
  connected: boolean;
  address?: string;
  error?: string;
};

const initial: ConnState = { connecting: false, connected: false };

interface SuiConnectProps {
  className?: string;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
}

export default function SuiConnect({
  className = "",
  onConnected,
  onDisconnected,
}: SuiConnectProps) {
  const currentSui = useCurrentAccount();
  const wallets = useWallets();
  const { mutateAsync: connectWallet } = useConnectWallet();
  const { mutateAsync: disconnectWallet } = useDisconnectWallet();
  const [sui, setSui] = useState<ConnState>(initial);

  const connectSui = useCallback(async () => {
    setSui((s) => ({ ...s, connecting: true, error: undefined }));
    try {
      const slush =
        wallets.find((w) => /slush/i.test(String(w?.name ?? w?.id ?? ""))) ||
        wallets[0];
      if (!slush) throw new Error("No Sui wallets available");
      await connectWallet({ wallet: slush });
      setSui({
        connecting: false,
        connected: true,
        address: currentSui?.address,
        error: undefined,
      });
      if (currentSui?.address) onConnected?.(currentSui.address);
    } catch (e: any) {
      setSui({
        connecting: false,
        connected: false,
        error: String(e?.message ?? e),
      });
    }
  }, [wallets, connectWallet, currentSui?.address]);

  const disconnectSui = useCallback(async () => {
    await disconnectWallet();
    setSui({ ...initial });
    onDisconnected?.();
  }, [disconnectWallet]);

  const state = {
    ...sui,
    connected: !!currentSui,
    address: currentSui?.address,
  };

  useEffect(() => {
    if (currentSui?.address) {
      console.log("Sui connected", currentSui?.address);
      console.log("Chain", currentSui?.chains);
      onConnected?.(currentSui.address);
    } else {
      onDisconnected?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSui?.address]);

  return (
    <section
      className={`rounded-xl border border-black/10 p-4 bg-sidebar ${className}`}
    >
      <h2 className="font-medium mb-2">Connect Sui Wallet</h2>
      <div className="text-sm text-black/70 min-h-6 mb-3">
        {state.connected && state.address ? (
          <div className="flex items-center space-x-1">
            <span className="text-zinc-400">Connected: </span>
            <code className="text-zinc-400">
              {`${state.address.slice(0, 6)}...${state.address.slice(-4)}`}
            </code>
          </div>
        ) : state.connected ? (
          <span className="text-zinc-400">Connected</span>
        ) : state.error ? (
          <span className="text-red-600">{state.error}</span>
        ) : (
          <span className="text-zinc-400">Not connected</span>
        )}
      </div>
      <div className="flex gap-2">
        {!state.connected ? (
          <Button
            onClick={connectSui}
            disabled={state.connecting}
            className="px-3 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {state.connecting ? "Connecting…" : "Connect"}
          </Button>
        ) : (
          <Button
            variant={"destructive"}
            onClick={disconnectSui}
            className="px-3 py-2 rounded-md text-sm"
          >
            Disconnect
          </Button>
        )}
      </div>
    </section>
  );
}
