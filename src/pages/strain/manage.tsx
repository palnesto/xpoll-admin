// src/pages/strain/manage.tsx

import { useEffect, useMemo, useState } from "react";
import { parseAbi } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { appToast } from "@/utils/toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";

/* ------------------------------------------------------------------ */
/* env */
/* ------------------------------------------------------------------ */

const RELAYER = import.meta.env.VITE_RELAYER_CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined;

// Prefer env owner (simple). If missing, fallback to on-chain owner().
const OWNER_ADDRESS = import.meta.env.VITE_RELAYER_OWNER_ADDRESS as
  | `0x${string}`
  | undefined;

const DECIMALS = Number(import.meta.env.VITE_TOKEN_DECIMALS ?? 6);

const TOKEN_ADDRESS = import.meta.env.VITE_STRAIN_TOKEN_ADDRESS as
  | `0x${string}`
  | undefined;

/* ------------------------------------------------------------------ */
/* abi */
/* ------------------------------------------------------------------ */

const relayerAbi = parseAbi([
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function pause() external",
  "function unpause() external",
  "function emergencyWithdraw(uint256 amount) external",
]);

/* ------------------------------------------------------------------ */
/* helpers */
/* ------------------------------------------------------------------ */

type LogType = "info" | "success" | "error" | "warning" | "pending";

async function addTokenToWallet() {
  if (!TOKEN_ADDRESS) {
    appToast.info("TOKEN_ADDRESS is not defined");
    return;
  }

  if (!window.ethereum) {
    alert("Wallet not found!");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: TOKEN_ADDRESS,
          symbol: "STR",
          decimals: 18,
          image: "",
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
}

function shortAddr(a?: string) {
  if (!a) return "n/a";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function shortTx(t?: string) {
  if (!t) return "n/a";
  return `${t.slice(0, 10)}…${t.slice(-6)}`;
}

// Parse "12.34" into base units (BigInt) with given decimals (no float math)
function parseUnitsStrict(input: string, decimals: number): bigint {
  const s = input.trim();
  if (!s) throw new Error("EMPTY_AMOUNT");

  const [wholeRaw, fracRaw = ""] = s.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;

  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fracRaw)) {
    throw new Error("BAD_AMOUNT");
  }

  const frac = fracRaw.slice(0, decimals).padEnd(decimals, "0");
  const combined = `${whole}${frac}`.replace(/^0+(?=\d)/, "");
  return BigInt(combined || "0");
}

/* ------------------------------------------------------------------ */
/* UI bits */
/* ------------------------------------------------------------------ */

function StatusBadge({
  paused,
  loading,
}: {
  paused: boolean;
  loading?: boolean;
}) {
  const cls = loading
    ? "bg-neutral-500/10 text-neutral-300 border-neutral-500/30"
    : paused
    ? "bg-red-500/15 text-red-300 border-red-500/30"
    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

  return (
    <div
      className={[
        "rounded-full border px-3 py-1 text-xs font-semibold",
        cls,
      ].join(" ")}
    >
      {loading ? "…" : paused ? "PAUSED" : "ACTIVE"}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page */
/* ------------------------------------------------------------------ */

export default function StrainManagementPage() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [activeTxHash, setActiveTxHash] = useState<`0x${string}` | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isWalletProviderPresent, setIsWalletProviderPresent] = useState(true);

  const addLog = (msg: string, type: LogType = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] [${type.toUpperCase()}] ${msg}`, ...prev]);
  };

  /* ------------------------------ reads ------------------------------ */

  const relayerPausedQ = useReadContract({
    address: RELAYER,
    abi: relayerAbi,
    functionName: "paused",
    query: { enabled: !!RELAYER, refetchInterval: 5000 },
  });

  const relayerOwnerQ = useReadContract({
    address: RELAYER,
    abi: relayerAbi,
    functionName: "owner",
    query: { enabled: !!RELAYER, refetchInterval: 15000 },
  });

  const isRelayerPaused = Boolean(relayerPausedQ.data);
  const relayerOwnerOnchain = relayerOwnerQ.data as `0x${string}` | undefined;

  /* --------------------------- access gate --------------------------- */

  const requiredOwner = useMemo(() => {
    if (OWNER_ADDRESS && OWNER_ADDRESS.startsWith("0x")) return OWNER_ADDRESS;
    return relayerOwnerOnchain;
  }, [relayerOwnerOnchain]);

  const isOwner = useMemo(() => {
    if (!address || !requiredOwner) return false;
    return address.toLowerCase() === requiredOwner.toLowerCase();
  }, [address, requiredOwner]);

  /* ------------------------------ receipt ------------------------------ */

  const receipt = useWaitForTransactionReceipt({
    hash: activeTxHash,
    confirmations: 1,
    enabled: !!activeTxHash,
  });

  useEffect(() => {
    if (!activeTxHash) return;

    if (receipt.isError) {
      addLog(`❌ Tx failed: ${shortTx(activeTxHash)}`, "error");
      setActiveTxHash(undefined);
      setIsSubmitting(false);
      return;
    }

    if (receipt.data) {
      if (receipt.data.status === "success") {
        addLog(`✅ Confirmed: ${shortTx(activeTxHash)}`, "success");
      } else {
        addLog(`❌ Reverted: ${shortTx(activeTxHash)}`, "error");
      }
      setActiveTxHash(undefined);
      setIsSubmitting(false);
    }
  }, [receipt.data, receipt.isError, activeTxHash]);

  const busy = isSubmitting || receipt.isLoading;

  /* ------------------------------ web2 sell status ------------------------------ */

  const web2StatusQ = useApiQuery(endpoints.strain.getWeb2SellStatus, {
    enabled: true,
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });

  const web2SellActive = useMemo(() => {
    if (!web2StatusQ.data) return true; // fallback safe default
    const isSellStrainActive = web2StatusQ.data?.data?.data?.isSellStrainActive;
    console.log("isSellStrainActive", isSellStrainActive);
    return Boolean(isSellStrainActive);
  }, [web2StatusQ.data]);

  const setWeb2SellM = useApiMutation({
    route: endpoints.strain.setWeb2SellStatus,
    method: "POST",
    onSuccess: () => {
      appToast.success("Updated Web2 sell status");
      web2StatusQ.refetch?.();
    },
  });

  async function setWeb2SellStatus(next: boolean) {
    if (!isConnected || !address) {
      addLog("Please connect wallet", "warning");
      return;
    }
    if (!isOwner) {
      addLog("Access denied: connect the relayer owner wallet", "error");
      return;
    }

    const label = next ? "Resume Web2 Sell" : "Pause Web2 Sell";
    const ok = window.confirm(`Confirm: ${label}?`);
    if (!ok) return;

    try {
      addLog(`Processing: ${label}`, "pending");

      await setWeb2SellM.mutateAsync({ isSellStrainActive: next });

      addLog(`✅ Success: ${label}`, "success");
      appToast.success(label);
    } catch (e: any) {
      addLog(
        `❌ ${label} failed: ${
          e?.message || e?.shortMessage || "Unknown error"
        }`,
        "error"
      );
    }
  }

  async function handlePauseWeb2Sell() {
    if (!web2SellActive) {
      addLog("Web2 sell is already paused", "info");
      return;
    }
    return setWeb2SellStatus(false);
  }

  async function handleResumeWeb2Sell() {
    if (web2SellActive) {
      addLog("Web2 sell is already active", "info");
      return;
    }
    return setWeb2SellStatus(true);
  }

  /* ------------------------------ actions ------------------------------ */

  async function onConnectWallet(connector: any) {
    try {
      await connectAsync({ connector });
      addLog("Wallet connected", "success");
      setIsWalletProviderPresent(true);
    } catch (e: any) {
      addLog(
        `Connect failed: ${e?.shortMessage || e?.message || "Unknown error"}`,
        "error"
      );
      setIsWalletProviderPresent(false);
    }
  }

  async function execTx(
    label: string,
    fn: "pause" | "unpause" | "emergencyWithdraw",
    args: any[] = []
  ) {
    if (!RELAYER) {
      addLog("Missing VITE_RELAYER_CONTRACT_ADDRESS", "error");
      return;
    }

    if (!isConnected || !address) {
      addLog("Please connect wallet", "warning");
      return;
    }

    if (!isOwner) {
      addLog("Access denied: connect the relayer owner wallet", "error");
      return;
    }

    const ok = window.confirm(`Confirm: ${label}?`);
    if (!ok) return;

    try {
      setIsSubmitting(true);
      addLog(`Processing: ${label}`, "pending");

      const hash = await writeContractAsync({
        address: RELAYER,
        abi: relayerAbi,
        functionName: fn,
        args,
      });

      setActiveTxHash(hash);
      addLog(`Tx sent: ${shortTx(hash)}`, "info");
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.message ||
        e?.cause?.shortMessage ||
        "Transaction failed";
      addLog(`❌ ${label} failed: ${String(msg)}`, "error");
      setIsSubmitting(false);
    }
  }

  const handleTogglePause = async () => {
    await execTx(
      isRelayerPaused
        ? "Resume Claims (Unpause)"
        : "Pause Claims (Maintenance)",
      isRelayerPaused ? "unpause" : "pause"
    );
  };

  const handleEmergencyWithdraw = async () => {
    try {
      const base = parseUnitsStrict(amount, DECIMALS);
      if (base <= 0n) {
        addLog("Amount must be > 0", "warning");
        return;
      }

      await execTx(`Emergency Withdraw ${amount}`, "emergencyWithdraw", [base]);
    } catch {
      addLog("Invalid amount format", "error");
    }
  };

  /* ------------------------------------------------------------------ */
  /* BLOCKED SCREEN */
  /* ------------------------------------------------------------------ */

  const shouldBlock = !isConnected || !address || !isOwner;

  if (shouldBlock) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-3xl">🔒</div>
              <h1 className="mt-2 text-xl font-bold">Admin Access Required</h1>
              <p className="mt-1 text-sm text-neutral-400">
                Connect the relayer owner wallet to access Strain admin
                controls.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs">
              <div className="text-neutral-500">Connected Wallet</div>
              <div className="mt-1 font-mono">
                {address ? address : "Not connected"}
              </div>

              {address && requiredOwner && !isOwner && (
                <div className="mt-2 text-[11px] text-red-300">
                  This wallet is not authorized. Disconnect and connect the
                  owner wallet.
                </div>
              )}

              {address && requiredOwner && isOwner && (
                <div className="mt-2 text-[11px] text-emerald-300">
                  Authorized. You can access the controls now.
                </div>
              )}
            </div>

            {!isWalletProviderPresent && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                Please install a wallet provider (MetaMask/Coinbase/etc).
              </div>
            )}

            <div className="flex flex-col gap-2">
              {isConnected ? (
                <button
                  onClick={() => {
                    disconnect();
                    addLog("Disconnected to switch wallet", "info");
                  }}
                  className="w-full rounded-lg bg-neutral-200 px-4 py-2 text-xs font-bold text-black hover:bg-white"
                >
                  Switch Wallet (Disconnect)
                </button>
              ) : (
                connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => onConnectWallet(connector)}
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 transition-colors"
                  >
                    Connect {connector.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* CONTROL PANEL (only when owner is connected) */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              Strain Management
            </h1>

            <StatusBadge
              paused={isRelayerPaused}
              loading={relayerPausedQ.isLoading}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-xs">
              <div className="text-neutral-500">Connected</div>
              <div className="font-mono">{shortAddr(address)}</div>
            </div>

            <button
              onClick={() => {
                disconnect();
                addLog("Disconnected wallet", "info");
              }}
              disabled={busy}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-semibold hover:bg-neutral-900 disabled:opacity-60"
            >
              Disconnect
            </button>

            <button
              onClick={() => addTokenToWallet()}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-semibold hover:bg-neutral-900"
            >
              Add Strain token to wallet
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Maintenance */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold tracking-wide">
                  🚧 Claims Maintenance
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Pause/unpause relayer claims.
                </div>
              </div>

              <StatusBadge
                paused={isRelayerPaused}
                loading={relayerPausedQ.isLoading}
              />
            </div>

            <div className="mt-4 space-y-2 text-xs text-neutral-400">
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">Relayer</span>
                <span className="font-mono">
                  {RELAYER ? shortAddr(RELAYER) : "n/a"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">Owner (on-chain)</span>
                <span className="font-mono">
                  {relayerOwnerOnchain ? shortAddr(relayerOwnerOnchain) : "…"}
                </span>
              </div>
            </div>

            <button
              onClick={handleTogglePause}
              disabled={busy}
              className={[
                "mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold transition",
                busy
                  ? "opacity-60 cursor-not-allowed bg-neutral-800 text-neutral-400"
                  : isRelayerPaused
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : "bg-amber-500 text-black hover:bg-amber-400",
              ].join(" ")}
            >
              {busy
                ? "Processing…"
                : isRelayerPaused
                ? "✅ Resume Claims (Unpause)"
                : "⏸️ Pause Claims (Maintenance)"}
            </button>

            {activeTxHash && (
              <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs">
                <div className="text-neutral-500">Pending Tx</div>
                <div className="mt-1 font-mono">{shortTx(activeTxHash)}</div>
              </div>
            )}
          </div>

          {/* Emergency Withdraw */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div>
              <div className="text-sm font-semibold tracking-wide">
                💸 Emergency Withdraw
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Withdraw tokens from relayer contract (owner-only).
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-neutral-500">
                Amount (e.g. 12.34, max decimals={DECIMALS})
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 12.34"
                disabled={busy}
                className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              />
            </div>

            <button
              onClick={handleEmergencyWithdraw}
              disabled={busy || !amount.trim()}
              className={[
                "mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold transition",
                busy || !amount.trim()
                  ? "opacity-60 cursor-not-allowed bg-neutral-800 text-neutral-400"
                  : "bg-red-500 text-white hover:bg-red-400",
              ].join(" ")}
            >
              {busy ? "Processing…" : "Execute Emergency Withdraw"}
            </button>

            {activeTxHash && (
              <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs">
                <div className="text-neutral-500">Pending Tx</div>
                <div className="mt-1 font-mono">{shortTx(activeTxHash)}</div>
              </div>
            )}
          </div>
        </div>

        {/* web 2 sell */}
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-wide">
                🛒 Web2 Sell Control
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Pause or resume Web2 sell operations.
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold border",
                web2SellActive
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/15 text-red-300 border-red-500/30",
              ].join(" ")}
            >
              {web2SellActive ? "ACTIVE" : "PAUSED"}
            </div>
          </div>

          {/* Action */}
          <button
            onClick={
              web2SellActive ? handlePauseWeb2Sell : handleResumeWeb2Sell
            }
            disabled={busy || setWeb2SellM.isPending}
            className={[
              "mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold transition",
              busy || setWeb2SellM.isPending
                ? "opacity-60 cursor-not-allowed bg-neutral-800 text-neutral-400"
                : web2SellActive
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-emerald-500 text-black hover:bg-emerald-400",
            ].join(" ")}
          >
            {busy || setWeb2SellM.isPending
              ? "Processing…"
              : web2SellActive
              ? "⏸️ Pause Web2 Sell"
              : "✅ Resume Web2 Sell"}
          </button>
        </div>
        {/* Logs */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="border-b border-neutral-800 px-4 py-2 text-[11px] text-neutral-500">
            SYSTEM LIVE LOGS
          </div>
          <div className="h-40 overflow-y-auto px-4 py-3">
            {logs.length === 0 ? (
              <div className="text-xs text-neutral-600">No logs yet.</div>
            ) : (
              <div className="space-y-1">
                {logs.map((l, i) => (
                  <div key={i} className="text-xs text-neutral-400">
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
