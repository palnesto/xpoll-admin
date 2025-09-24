import { useCallback, useState } from 'react';

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

export default function AptosConnect({ className = '', address, onConnected, onDisconnected }: AptosConnectProps) {
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
      url.searchParams.set('return', returnUrl);
      window.location.href = url.toString();
    } catch (e: any) {
      setAptos({ connecting: false, connected: false, error: String(e?.message ?? e) });
    }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try {
      const base = import.meta.env.VITE_APTOS_CONNECT_URL;
      const returnUrl = window.location.href;
      const url = new URL(base);
      url.searchParams.set('return', returnUrl);
      url.searchParams.set('disconnect', '1');
      window.location.href = url.toString();
    } catch {
      // no-op
    } finally {
      setAptos({ ...initial });
      try { onDisconnected?.(); } catch {}
    }
  }, [onDisconnected]);

  return (
    <section className={`rounded-xl border border-black/10 p-4 bg-white/50 ${className}`}>
      <h2 className="font-medium mb-2">Connect Aptos Wallet</h2>
      <div className="text-sm text-black/70 min-h-6 mb-3">
        {isConnected && displayAddress ? (
          <div className="flex items-center space-x-1">
            <span>Connected: </span>
            <code className="font-mono bg-gray-100 px-2 py-0.5 rounded">
              {`${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`}
            </code>
          </div>
        ) : isConnected ? (
          <span>Connected</span>
        ) : aptos.error ? (
          <span className="text-red-600">{aptos.error}</span>
        ) : (
          <span>Not connected</span>
        )}
      </div>
      <div className="flex gap-2">
        {!isConnected ? (
          <button
            onClick={connectAptos}
            disabled={aptos.connecting}
            className="px-3 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
          >
            {aptos.connecting ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <button
            onClick={disconnectAptos}
            className="px-3 py-2 rounded-md bg-gray-200 text-sm hover:bg-gray-300"
          >
            Disconnect
          </button>
        )}
      </div>
    </section>
  );
}
