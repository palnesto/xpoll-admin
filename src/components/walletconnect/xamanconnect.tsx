import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  createXamanPayload,
  getXamanPayload,
  waitForXamanAccount,
} from "@/lib/xaman";

type ConnState = {
  connecting: boolean;
  connected: boolean;
  address?: string;
  error?: string;
};

const initial: ConnState = { connecting: false, connected: false };

interface XamanConnectProps {
  className?: string;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
}

export default function XamanConnect({
  className = "",
  onConnected,
  onDisconnected,
}: XamanConnectProps) {
  const [xrpAddress, setXrpAddress] = useState<string>("");
  const [xrp, setXrp] = useState<ConnState>(() => ({
    ...initial,
    connected: !!xrpAddress,
    address: xrpAddress || undefined,
  }));
  const [xamanQRModalOpen, setXamanQRModalOpen] = useState(false);
  const [xamanQR, setXamanQR] = useState<string | undefined>(undefined);
  const activeUuidRef = useRef<string | null>(null);
  const xummSocketRef = useRef<WebSocket | null>(null);
  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const cleanupXummSocket = useCallback(() => {
    if (xummSocketRef.current) {
      try {
        xummSocketRef.current.close();
      } catch {}
      xummSocketRef.current = null;
    }
  }, []);

  // moved to shared lib/xaman.ts

  const connectXaman = useCallback(async () => {
    try {
      setXrp((s) => ({ ...s, connecting: true, error: undefined }));
      const created = await createXamanPayload();
      if (!created) throw new Error("Failed to create Xaman payload");

      const { uuid, next, qrPng, websocketStatus } = created;
      activeUuidRef.current = uuid;

      if (!isMobile) {
        setXamanQR(qrPng || undefined);
        setXamanQRModalOpen(true);
      } else {
        const deep = next?.always || next?.return_url?.web;
        if (deep) window.location.href = deep;
      }

      if (xummSocketRef.current) {
        try {
          xummSocketRef.current.close();
        } catch {}
      }

      xummSocketRef.current = new WebSocket(websocketStatus!);

      xummSocketRef.current.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (activeUuidRef.current !== uuid) return;

          if (msg?.expired) {
            toast.error("Xaman request expired. Try again.");
            setXrp({
              connecting: false,
              connected: false,
              error: "Xaman request expired",
            });
            setXamanQRModalOpen(false);
            xummSocketRef?.current?.close();
            return;
          }
          if (msg?.signed === false) {
            toast.error("Xaman request was rejected");
            setXrp({
              connecting: false,
              connected: false,
              error: "User rejected in Xaman",
            });
            setXamanQRModalOpen(false);
            xummSocketRef?.current?.close();
            return;
          }
          if (msg?.signed === true) {
            const account = await waitForXamanAccount(uuid);
            if (activeUuidRef.current !== uuid) return;
            console.log("XRP connected", account);
            console.log("XRP chain");
            setXrpAddress(account);
            setXrp({ connecting: false, connected: true, address: account });
            if (!isMobile) setXamanQRModalOpen(false);
            toast.success("Xaman wallet connected");
            xummSocketRef?.current?.close();
            try {
              onConnected?.(account);
            } catch {}
          }
        } catch (err: any) {
          console.error("WS handler error:", err);
          toast.error(err?.message || "Failed to complete Xaman connect");
          setXrp({
            connecting: false,
            connected: false,
            error: err?.message || "Xaman connect failed",
          });
          xummSocketRef?.current?.close();
        }
      };

      xummSocketRef.current.onerror = () =>
        toast.error("Xaman websocket error");
    } catch (e: any) {
      console.error("Xaman connect error:", e);
      toast.error(e?.message || "Xaman connect failed");
      setXrp({
        connecting: false,
        connected: false,
        error: e?.message || "Xaman connect failed",
      });
    }
  }, [isMobile]);

  const disconnectXaman = useCallback(() => {
    setXrpAddress("");
    setXrp({ ...initial });
    cleanupXummSocket();
    toast.success("Disconnected Xaman");
    try {
      onDisconnected?.();
    } catch {}
  }, [cleanupXummSocket]);

  return (
    <>
      <section
        className={`rounded-xl border border-black/10 p-4 bg-sidebar ${className}`}
      >
        <h2 className="font-medium mb-2">Connect Xaman (XRP)</h2>
        <div className="text-sm text-black/70 min-h-6 mb-3">
          {xrp.connected && xrp.address ? (
            <div className="flex items-center space-x-1">
              <span>Connected: </span>
              <code className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                {`${xrp.address.slice(0, 6)}...${xrp.address.slice(-4)}`}
              </code>
            </div>
          ) : xrp.connected ? (
            <span className="text-zinc-500">Connected</span>
          ) : xrp.error ? (
            <span className="text-red-600">{xrp.error}</span>
          ) : (
            <span className="text-zinc-500">Not connected</span>
          )}
        </div>
        <div className="flex gap-2">
          {!xrp.connected ? (
            <button
              onClick={connectXaman}
              disabled={xrp.connecting}
              className="px-3 py-2 rounded-md bg-foreground text-background text-sm disabled:opacity-60"
            >
              {xrp.connecting ? "Connecting…" : "Connect"}
            </button>
          ) : (
            <button
              onClick={disconnectXaman}
              className="px-3 py-2 rounded-md bg-gray-200 text-sm hover:bg-gray-300"
            >
              Disconnect
            </button>
          )}
        </div>
      </section>

      {/* Xaman Modal */}
      {xamanQRModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="xaman-qr-title"
        >
          <section className="relative overflow-hidden rounded-2xl p-5 md:p-6 bg-gradient-to-br from-[#0F172A] via-[#0b1430] to-[#141b3a] text-white shadow-2xl border border-white/10 max-w-md w-[92vw]">
            {/* Glow / decoration */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-30 bg-indigo-500" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full blur-3xl opacity-20 bg-fuchsia-500" />

            {/* Close button */}
            <button
              onClick={() => {
                setXamanQRModalOpen(false);
                cleanupXummSocket();
              }}
              className="absolute right-3 top-3 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-4 text-center">
              <h4
                id="xaman-qr-title"
                className="text-xl md:text-2xl font-semibold tracking-tight"
              >
                Scan with Xaman
              </h4>
              <p className="text-sm md:text-[13px] text-white/70 mt-1">
                Open the <span className="font-medium">Xaman</span> app on your
                phone and scan the QR to connect.
              </p>
            </div>

            {/* QR card */}
            <div className="mx-auto rounded-2xl p-3 md:p-4 bg-white shadow-lg border border-black/5 max-w-xs">
              {xamanQR ? (
                <img
                  src={xamanQR}
                  alt="Xaman sign-in QR"
                  className="mx-auto h-60 w-60 object-contain"
                />
              ) : (
                <div className="h-60 w-60 mx-auto rounded-lg bg-gray-200 animate-pulse" />
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-center gap-3">
              {xamanQR && (
                <a
                  href={xamanQR}
                  download="xaman-qr.png"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white text-[#0F172A] font-medium hover:bg-gray-100 active:bg-gray-200 transition shadow-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-[18px] w-[18px]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 16l4-5h-3V4h-2v7H8l4 5zm6 2H6v2h12v-2z" />
                  </svg>
                  Download
                </a>
              )}

              <button
                onClick={() => {
                  setXamanQRModalOpen(false);
                  cleanupXummSocket();
                }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white/10 text-white border border-white/15 hover:bg-white/15 active:bg-white/20 transition"
              >
                Close
              </button>
            </div>

            {/* Help footer */}
            <div className="mt-4 text-center text-xs text-white/60">
              Having trouble? Ensure your phone and computer are online, then
              refresh and try again.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
