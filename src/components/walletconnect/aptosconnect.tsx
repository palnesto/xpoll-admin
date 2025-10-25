import { useCallback, useState } from "react";
import { Button } from "../ui/button";

type ConnState = {
  connecting: boolean;
  connected: boolean;
  address?: string;
  error?: string;
};

const initial: ConnState = { connecting: false, connected: false };

interface AptosConnectProps {
  className?: string;
  // If provided, this is the authoritative connected address (from parent/session)
  address?: string;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
}

export default function AptosConnect({
  className = "",
  address,
  onConnected,
  onDisconnected,
}: AptosConnectProps) {
  const [aptos, setAptos] = useState<ConnState>(initial);
  const isConnected = !!address || aptos.connected;
  const displayAddress = address || aptos.address;

  const connectAptos = useCallback(async () => {
    setAptos((s) => ({ ...s, connecting: true, error: undefined }));
    try {
      console.log(import.meta.env.VITE_APTOS_CONNECT_URL);
      const base = import.meta.env.VITE_APTOS_CONNECT_URL;
      const returnUrl = window.location.href;
      const url = new URL(base);
      url.searchParams.set("return", returnUrl);
      window.location.href = url.toString();
    } catch (e: any) {
      setAptos({
        connecting: false,
        connected: false,
        error: String(e?.message ?? e),
      });
    }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try {
      const base = import.meta.env.VITE_APTOS_CONNECT_URL;
      const returnUrl = window.location.href;
      const url = new URL(base);
      url.searchParams.set("return", returnUrl);
      url.searchParams.set("disconnect", "1");
      window.location.href = url.toString();
    } catch {
      // no-op
    } finally {
      setAptos({ ...initial });
      try {
        onDisconnected?.();
      } catch {}
    }
  }, [onDisconnected]);

  return (
    <section
      className={`rounded-xl border border-black/10 p-4 bg-sidebar ${className}`}
    >
      <h2 className="font-medium mb-2">Connect Aptos Wallet</h2>
      <div className="text-sm min-h-6 mb-3">
        {isConnected && displayAddress ? (
          <div className="flex items-center space-x-1">
            <span className="text-zinc-400">Connected: </span>
            <code className="text-zinc-400">
              {`${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`}
            </code>
          </div>
        ) : isConnected ? (
          <span className="text-zinc-400">Connected</span>
        ) : aptos.error ? (
          <span className="text-red-600">{aptos.error}</span>
        ) : (
          <span className="text-zinc-400">Not connected</span>
        )}
      </div>
      <div className="flex gap-2 text-black">
        {!isConnected ? (
          <Button
            onClick={connectAptos}
            disabled={aptos.connecting}
            className="px-3 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {aptos.connecting ? "Connecting…" : "Connect"}
          </Button>
        ) : (
          <Button
            variant={"destructive"}
            onClick={disconnectAptos}
            className="px-3 py-2 rounded-md text-sm"
          >
            Disconnect
          </Button>
        )}
      </div>
    </section>
  );
}
