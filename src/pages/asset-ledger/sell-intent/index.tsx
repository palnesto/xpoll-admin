import { useCallback, useMemo, useRef, useState } from "react";
import { appToast } from "@/utils/toast";
import api from "@/api/queryClient";
import XamanConnect from "@/components/walletconnect/xamanconnect";
import SuiConnect from "@/components/walletconnect/suiconnect";
import AptosConnect from "@/components/walletconnect/aptosconnect";
import React from "react";
import { createXamanPayload, getXamanPayload } from "@/lib/xaman";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { endpoints } from "@/api/endpoints";

type WalletName = "XRP" | "SUI" | "APTOS";

type WithdrawReq = {
  id: string;
  user: string;
  walletName: WalletName;
  walletAddress: string;
  amount: number; // in network unit for simplicity
  status: "pending" | "transferred" | "rejected";
  txHash?: string;
  remark?: string;
};

type BackendBatchResult = {
  id: string;
  success: boolean;
  txHash?: string;
  error?: string;
};

export default function SellIntent() {
  const [adminXrp, setAdminXrp] = useState<string | null>(null);
  const [adminSui, setAdminSui] = useState<string | null>(null);
  const [adminAptos, setAdminAptos] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WalletName | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const BATCH_LIMIT = 50;

  // Sui hooks
  const currentSui = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const adminSuiAddress = "0x438de5cebd6ad0a6a0d06c91f521a5e7711c9e99a535173e8ef816845d6a8775";
  // Xaman (XRP) payment modal state
  const [xamanQRModalOpen, setXamanQRModalOpen] = useState(false);
  const [xamanQR, setXamanQR] = useState<string | undefined>(undefined);
  const xummSocketRef = useRef<WebSocket | null>(null);
  const activeUuidRef = useRef<string | null>(null);
  const adminXrpAddress = "rogve1svqrwm1sFcViAUZAUAtwvTHkgTR";
  const adminAptosAddress = "0xaea4b50f4223c03e289c2172e470dae408c07e9ee63bf8e524446471bab197f9";
  const aptosTransferBase = import.meta.env.VITE_APTOS_TRANSFER_URL || 'http://localhost:3000/transferAptos.tsx';
  const aptosTransferNetwork = import.meta.env.VITE_APTOS_TRANSFER_NETWORK || 'devnet';
  const aptosTransferFullnode = import.meta.env.VITE_APTOS_TRANSFER_FULLNODE || '';

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [requests, setRequests] = useState<WithdrawReq[]>([
    {
      id: "REQ-1001",
      user: "Alice",
      walletName: "XRP",
      walletAddress: "r4rtdUM6haJtcX45MDmKyAszJv1snwA9dv",
      amount: 0.005,
      status: "pending",
    },
    {
      id: "REQ-1002",
      user: "Bob",
      walletName: "SUI",
      walletAddress: "0xe45af03471553ac02afaa1a54d9f8295135b74d86bb4d31a166f9e4f288a16af",
      amount: 0.6,
      status: "pending",
    },
    {
      id: "REQ-1003",
      user: "Charlie",
      walletName: "XRP",
      walletAddress: "rmcQD8isfRKaLAJrP19arMPx3e71Na9Un",
      amount: 0.003,
      status: "pending",
    },
    {
      id: "REQ-1004",
      user: "Diana",
      walletName: "APTOS",
      walletAddress: "0xa35d4e66ee45291fa56ab07da6e0b1dde8494a04bad6a6aaca315e188fcedbb4",
      amount: 0.04,
      status: "pending",
    },
    {
      id: "REQ-1005",
      user: "Ethan",
      walletName: "SUI",
      walletAddress: "0x139387b5935ac18f4a19d06dd83dfdef0cd1c963b6f9d49c4aba5ca315bc3ec2",
      amount: 0.5,
      status: "pending",
    },
    {
      id: "REQ-1006",
      user: "Fiona",
      walletName: "APTOS",
      walletAddress: "0xa35d4e66ee45291fa56ab07da6e0b1dde8494a04bad6a6aaca315e188fcedbb4",
      amount: 0.035,
      status: "pending",
    },
    {
      id: "REQ-1007",
      user: "George",
      walletName: "XRP",
      walletAddress: "rmcQD8isfRKaLAJrP19arMPx3e71Na9Un",
      amount: 0.004,
      status: "pending",
    },
    {
      id: "REQ-1008",
      user: "Hannah",
      walletName: "SUI",
      walletAddress: "0x9d803cbdbcd1532277757d2009f1fb464c4ccbd800a054e3f095a1a569e729c5",
      amount: 0.4,
      status: "pending",
    },
    {
      id: "REQ-1009",
      user: "Ivan",
      walletName: "APTOS",
      walletAddress: "0xa35d4e66ee45291fa56ab07da6e0b1dde8494a04bad6a6aaca315e188fcedbb4",
      amount: 0.025,
      status: "pending",
    },
    {
      id: "REQ-1010",
      user: "Jasmine",
      walletName: "XRP",
      walletAddress: "rmcQD8isfRKaLAJrP19arMPx3e71Na9Un",
      amount: 0.003,
      status: "pending",
    },
  ]);

  const isValidXrplClassic = (addr: string) => /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/.test(addr);
  const isValidAptosAddress = (addr: string) => /^0x[0-9a-fA-F]{1,64}$/.test(addr);

  const filteredRequests = useMemo(() => {
    if (!selectedNetwork) return [];
    return requests.filter((r) => r.walletName === selectedNetwork);
  }, [requests, selectedNetwork]);

  const pendingFiltered = useMemo(
    () => filteredRequests.filter((r) => r.status === "pending"),
    [filteredRequests]
  );

  const anyPending = useMemo(
    () => pendingFiltered.length > 0,
    [pendingFiltered]
  );

  const ensureSuiFunds = useCallback(
    async (requiredMist: bigint) => {
      if (!currentSui?.address) throw new Error("Connect Sui wallet first");
      const balance = await suiClient.getBalance({ owner: currentSui.address, coinType: "0x2::sui::SUI" });
      const total = BigInt(balance?.totalBalance ?? 0);
      if (total < requiredMist) {
        const have = Number(total) / 1e9;
        const need = Number(requiredMist) / 1e9;
        throw new Error(
          `Insufficient SUI balance (have ${have.toFixed(3)} SUI, need ${need.toFixed(3)} SUI including fees)`
        );
      }
    },
    [currentSui?.address, suiClient]
  );

  const toMist = (amount: number) => BigInt(Math.round(amount * 1e9));
  const baseSuiBuffer = BigInt(2e8); // ~0.2 SUI buffer for gas and storage

  const ensureExpectedWallet = useCallback(
    (actual: string | null | undefined, expected: string, label: string) => {
      if (!actual) throw new Error(`Connect ${label} admin wallet first.`);
      if (actual.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(`${label} wallet does not match the authorized admin address.`);
      }
    },
    []
  );

  const applyRemarks = useCallback((entries: Array<{ id: string; remark?: string }>) => {
    if (!entries.length) return;
    const remarkMap = new Map(entries.map((entry) => [entry.id, entry.remark]));
    setRequests((prev) =>
      prev.map((req) =>
        remarkMap.has(req.id) ? { ...req, remark: remarkMap.get(req.id) } : req
      )
    );
  }, []);

  const persistAptosResults = useCallback(
    async (
      rawResults: Array<{ ref: string; success: boolean; tx?: string; error?: string }>,
      rawPayload?: unknown
    ) => {
      if (!rawResults.length) return;
      try {
        const payload = rawResults.map((item) => ({
          id: String(item.ref),
          success: Boolean(item.success),
          ...(item.tx ? { txHash: String(item.tx) } : {}),
          ...(item.error ? { error: String(item.error) } : {}),
        }));

        await api.post(endpoints.web3.recordAptosBatchResult, {
          adminAddress: adminAptos || undefined,
          network: 'APTOS',
          results: payload,
          rawPayload,
        });
      } catch (err: any) {
        console.error('Failed to persist Aptos batch results', err);
        appToast.error(err?.message || 'Failed to record Aptos batch results on backend');
      }
    },
    [adminAptos]
  );

  const validateAddresses = useCallback(
    async (network: Extract<WalletName, 'XRP' | 'APTOS'>, items: WithdrawReq[]) => {
      if (!items.length) {
        return [] as Array<{ id: string; walletAddress: string; active: boolean; reason?: string }>;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const { data } = await api.post(
          endpoints.web3.checkAddressActivation,
          {
            network,
            addresses: items.map(({ id, walletAddress }) => ({ id, walletAddress })),
          },
          { signal: controller.signal }
        );
        return (data?.data?.results ?? []) as Array<{
          id: string;
          walletAddress: string;
          active: boolean;
          reason?: string;
        }>;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          throw new Error('Address activation check timed out. Please retry.');
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    },
    []
  );

  // Handle Aptos return params (connect/disconnect/tx)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const u = new URL(window.location.href);
      const addr = u.searchParams.get('aptos_address');
      const disc = u.searchParams.get('aptos_disconnect');
      const tx = u.searchParams.get('aptos_tx');
      const ref = u.searchParams.get('ref');
      const batch = u.searchParams.get('aptos_batch');
      if (disc) setAdminAptos(null);
      if (addr) setAdminAptos(addr);
      if (tx && ref) {
        console.log('Aptos transfer result', { ref, tx });
        setRequests((prev) =>
          prev.map((x) =>
            x.id === ref
              ? { ...x, status: 'transferred', txHash: tx, remark: undefined }
              : x
          )
        );
        appToast.success(`Aptos transfer complete (tx: ${tx.slice(0,8)}...)`);
        void persistAptosResults([{ ref, success: true, tx }], { ref, tx });
      }
      if (batch) {
        try {
          const decoded = JSON.parse(batch);
          if (Array.isArray(decoded)) {
            console.log('Aptos batch results', decoded);
            void persistAptosResults(decoded, { batch });
            let successCount = 0;
            let failureCount = 0;
            const failureRefs: string[] = [];
            setRequests((prev) => prev.map((req) => {
              const match = decoded.find((item: any) => item?.ref === req.id);
              if (!match) return req;
              if (match?.success) {
                successCount += 1;
                return {
                  ...req,
                  status: 'transferred' as const,
                  txHash: match?.tx ? String(match.tx) : req.txHash,
                  remark: undefined,
                };
              }
              failureCount += 1;
              if (match?.ref) failureRefs.push(String(match.ref));
              return {
                ...req,
                txHash: match?.tx ? String(match.tx) : req.txHash,
                remark: match?.reason ? String(match.reason) : req.remark,
              };
            }));
            if (successCount) {
              appToast.success(`Transferred ${successCount} Aptos request${successCount > 1 ? 's' : ''}.`);
            }
            if (failureCount) {
              appToast.error(`Failed to transfer ${failureCount} Aptos request${failureCount > 1 ? 's' : ''}${failureRefs.length ? ` (${failureRefs.join(', ')})` : ''}.`);
            }
          }
        } catch (err) {
          console.error('Failed to parse aptos batch result', err);
          appToast.error('Unable to read Aptos batch result');
        }
      }
      if (addr || disc || tx || ref) {
        u.searchParams.delete('aptos_address');
        u.searchParams.delete('aptos_disconnect');
        u.searchParams.delete('aptos_tx');
        u.searchParams.delete('ref');
        u.searchParams.delete('aptos_batch');
        window.history.replaceState({}, '', u.toString());
      }
    } catch {}
  }, [persistAptosResults]);


  const transferSui = useCallback(async (req: WithdrawReq) => {
    if (!currentSui?.address) throw new Error("Connect Sui wallet first");
    ensureExpectedWallet(adminSui, adminSuiAddress, 'SUI');
    ensureExpectedWallet(currentSui.address, adminSuiAddress, 'SUI');
    const mist = toMist(req.amount);
    await ensureSuiFunds(mist + baseSuiBuffer);
    console.log("Transferring SUI", mist, "to", req.walletAddress);
    console.log("Current Sui address:", currentSui.address);
    const tx = new Transaction();
    tx.setSender(currentSui.address);
    const [coin] = tx.splitCoins(tx.gas, [mist]);
    tx.transferObjects([coin], req.walletAddress);
    const res = await signAndExecute({ transaction: tx });
    if (!res?.digest) throw new Error("Sui transfer failed");
    return res.digest as string;
  }, [adminSui, currentSui?.address, ensureExpectedWallet, ensureSuiFunds, signAndExecute]);

  const transferSuiBatch = useCallback(async (items: WithdrawReq[]) => {
    if (!currentSui?.address) throw new Error("Connect Sui wallet first");
    if (!items.length) throw new Error('No SUI requests to transfer');
    ensureExpectedWallet(adminSui, adminSuiAddress, 'SUI');
    ensureExpectedWallet(currentSui.address, adminSuiAddress, 'SUI');
    const tx = new Transaction();
    tx.setSender(currentSui.address);
    const totalMist = items.reduce((sum, req) => sum + toMist(req.amount), 0n);
    const buffer = baseSuiBuffer + BigInt(items.length) * BigInt(5e7); // extra per transfer
    await ensureSuiFunds(totalMist + buffer);

    const coins = items.map((req) => {
      const mist = toMist(req.amount);
      const [coin] = tx.splitCoins(tx.gas, [mist]);
      return coin;
    });
    coins.forEach((coin, idx) => {
      const destination = items[idx].walletAddress;
      tx.transferObjects([coin], destination);
    });
    const res = await signAndExecute({ transaction: tx });
    if (!res?.digest) throw new Error('Sui batch transfer failed');
    return res.digest as string;
  }, [adminSui, currentSui?.address, ensureExpectedWallet, ensureSuiFunds, signAndExecute]);


  //xaman helpers
  const cleanupXummSocket = useCallback(() => {
    if (xummSocketRef.current) {
      try { xummSocketRef.current.close(); } catch { }
      xummSocketRef.current = null;
    }
  }, []);

  const transferXrpViaXaman = useCallback(async (req: WithdrawReq) => {
    if (!adminXrp) throw new Error("Connect XRP (Xaman) wallet first");
    ensureExpectedWallet(adminXrp, adminXrpAddress, 'XRP');
    if (!isValidXrplClassic(req.walletAddress)) throw new Error("Invalid XRPL address for destination");
    const drops = String(Math.round(req.amount * 1_000_000));
    const created = await createXamanPayload({
      txJson: {
        TransactionType: 'Payment',
        Destination: req.walletAddress, // pay user
        Amount: drops,
      },
    });
    const { uuid, next, qrPng, websocketStatus } = created;
    activeUuidRef.current = uuid;

    if (!isMobile) {
      setXamanQR(qrPng || undefined);
      setXamanQRModalOpen(true);
    } else {
      const deep = next?.always || next?.return_url?.web;
      if (deep) window.location.href = deep;
    }

    return await new Promise<string>((resolve, reject) => {
      try {
        xummSocketRef.current = new WebSocket(websocketStatus!);
        xummSocketRef.current.onmessage = async (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (activeUuidRef.current !== uuid) return;
            if (msg?.expired) {
              setXamanQRModalOpen(false);
              cleanupXummSocket();
              return reject(new Error('Xaman request expired'));
            }
            if (msg?.signed === false) {
              setXamanQRModalOpen(false);
              cleanupXummSocket();
              return reject(new Error('User rejected in Xaman'));
            }
            if (msg?.signed === true) {
              const payload = await getXamanPayload(uuid);
              setXamanQRModalOpen(false);
              cleanupXummSocket();
              const hash = payload?.response?.txid || payload?.txid || payload?.meta?.txid || uuid;
              resolve(String(hash));
            }
          } catch (err) {
            cleanupXummSocket();
            reject(err as any);
          }
        };
        xummSocketRef.current.onerror = () => {
          cleanupXummSocket();
          reject(new Error('Xaman websocket error'));
        };
      } catch (e) {
        cleanupXummSocket();
        reject(e as any);
      }
    });
  }, [adminXrp, ensureExpectedWallet, isMobile, cleanupXummSocket]);

  const submitXrpBatch = useCallback(async (items: WithdrawReq[]) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const { data } = await api.post(
        endpoints.web3.createbatchTransfer,
        {
          network: 'XRP',
          transfers: items.map(({ id, walletAddress, amount }) => ({ id, walletAddress, amount })),
        },
        { signal: controller.signal }
      );
      return (data?.data?.results ?? []) as BackendBatchResult[];
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Batch transfer request timed out. Please retry or check backend connectivity.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const launchAptosTransferWindow = useCallback((items: WithdrawReq[]) => {
    if (typeof window === 'undefined') return false;
    if (!items.length) return false;
    try {
      const url = new URL(aptosTransferBase);
      url.searchParams.set('return', window.location.href);
      url.searchParams.set(
        'batch',
        JSON.stringify(
          items.map(({ id, walletAddress, amount }) => ({
            ref: id,
            to: walletAddress,
            amountApt: amount.toString(),
          }))
        )
      );
      if (aptosTransferNetwork) {
        url.searchParams.set('network', aptosTransferNetwork);
      }
      if (aptosTransferNetwork === 'custom' && aptosTransferFullnode) {
        url.searchParams.set('fullnode', aptosTransferFullnode);
      }
      url.searchParams.set('auto', '1');
      const opened = window.open(url.toString(), '_blank', 'noopener');
      return Boolean(opened);
    } catch (err) {
      console.error('Failed to open Aptos transfer window', err);
      throw err;
    }
  }, [aptosTransferBase, aptosTransferFullnode, aptosTransferNetwork]);

  const approveAndTransfer = useCallback(async (req: WithdrawReq) => {
    setProcessingId(req.id);
    try {
      appToast.info(`Transferring ${req.amount} ${req.walletName}…`);
      let txid: string | undefined;
      if (req.walletName === "SUI") {
        txid = await transferSui(req);
      } else if (req.walletName === "XRP") {
        txid = await transferXrpViaXaman(req);
      } else if (req.walletName === 'APTOS') {
        ensureExpectedWallet(adminAptos, adminAptosAddress, 'APTOS');
        if (!isValidAptosAddress(req.walletAddress)) {
          throw new Error('Invalid Aptos address');
        }
        const opened = launchAptosTransferWindow([req]);
        if (!opened) {
          throw new Error('Popup blocked. Allow popups to continue and retry the Aptos transfer.');
        }
        appToast.info('Aptos transfer window opened. Complete the transfer there to sync results.');
        return;
      }
      setRequests((prev) =>
        prev.map((x) =>
          x.id === req.id
            ? { ...x, status: 'transferred', txHash: txid || x.txHash, remark: undefined }
            : x
        )
      );
      appToast.success(
        `Transferred ${req.amount} ${req.walletName} to ${req.walletAddress.slice(0, 6)}...${req.walletAddress.slice(-4)}${txid ? ` (tx: ${txid.slice(0,8)}...)` : ''}`
      );
    } catch (e: any) {
      appToast.error(e?.message || "Transfer failed");
    } finally {
      setProcessingId(null);
    }
  }, [adminAptos, ensureExpectedWallet, launchAptosTransferWindow, transferSui, transferXrpViaXaman]);

  const batchTransfer = useCallback(async () => {
    if (!selectedNetwork) {
      appToast.info('Select a network first');
      return;
    }
    if (!pendingFiltered.length) {
      appToast.info(`No pending ${selectedNetwork} requests.`);
      return;
    }

    if (selectedNetwork === 'APTOS') {
      try {
        ensureExpectedWallet(adminAptos, adminAptosAddress, 'APTOS');
      } catch (err: any) {
        appToast.error(err?.message || 'Connect APTOS admin wallet first.');
        return;
      }
      const invalid = pendingFiltered.filter((req) => !isValidAptosAddress(req.walletAddress));
      if (invalid.length) {
        appToast.error(`Invalid Aptos address${invalid.length > 1 ? 'es' : ''}: ${invalid.map((r) => r.id).join(', ')}`);
        return;
      }

      let activationResults: Array<{ id: string; walletAddress: string; active: boolean; reason?: string }> = [];
      try {
        activationResults = await validateAddresses('APTOS', pendingFiltered);
        if (activationResults.length) {
          applyRemarks(
            activationResults.map((item) => ({
              id: item.id,
              remark: item.active
                ? undefined
                : item.reason || 'Wallet address is not active on ledger. Please activate it on ledger and try again.',
            }))
          );
        }
      } catch (err: any) {
        console.error('Aptos address activation check failed', err);
        appToast.error(err?.message || 'Failed to verify Aptos wallet activation.');
        return;
      }

      const inactiveAptos = activationResults.filter((item) => !item.active);
      if (inactiveAptos.length) {
        appToast.error(
          `Cannot start Aptos batch. Inactive address${inactiveAptos.length > 1 ? 'es' : ''}: ${inactiveAptos
            .map((item) => item.walletAddress)
            .join(', ')}. Please activate them on ledger and try again.`
        );
        return;
      }

      setIsBatchProcessing(true);
      try {
        console.log('Launching Aptos batch transfer', {
          count: pendingFiltered.length,
          requests: pendingFiltered.map(({ id, walletAddress, amount }) => ({ id, walletAddress, amount })),
        });
        const opened = launchAptosTransferWindow(pendingFiltered);
        if (!opened) {
          appToast.error('Popup blocked. Allow popups to start the Aptos batch transfer.');
          return;
        }
        appToast.info(
          `Opened Aptos batch transfer for ${pendingFiltered.length} request${pendingFiltered.length > 1 ? 's' : ''}. Complete the flow in the new window.`
        );
      } catch (err: any) {
        console.error('Failed to launch Aptos batch transfer', err);
        appToast.error(err?.message || 'Failed to start Aptos batch transfer.');
      } finally {
        setIsBatchProcessing(false);
        setProcessingId(null);
      }
      return;
    }
    if (selectedNetwork === 'SUI') {
      try {
        ensureExpectedWallet(adminSui, adminSuiAddress, 'SUI');
        ensureExpectedWallet(currentSui?.address, adminSuiAddress, 'SUI');
      } catch (err: any) {
        appToast.error(err?.message || 'Connect SUI admin wallet first.');
        return;
      }
      setIsBatchProcessing(true);
      const batches: WithdrawReq[][] = [];
      for (let i = 0; i < pendingFiltered.length; i += BATCH_LIMIT) {
        batches.push(pendingFiltered.slice(i, i + BATCH_LIMIT));
      }
      let totalSuccess = 0;
      try {
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const ids = new Set(batch.map((req) => req.id));
          appToast.info(`Processing SUI batch ${i + 1}/${batches.length} (${batch.length} transfers)…`);
          const txid = await transferSuiBatch(batch);
          setRequests((prev) =>
            prev.map((req) =>
              ids.has(req.id)
                ? { ...req, status: 'transferred', txHash: txid || req.txHash, remark: undefined }
                : req
            )
          );
          totalSuccess += batch.length;
          appToast.success(
            `Completed SUI batch ${i + 1}/${batches.length}${txid ? ` (tx: ${txid.slice(0,8)}...)` : ''}`
          );
        }
        if (totalSuccess) {
          appToast.success(
            `Transferred ${totalSuccess} SUI request${totalSuccess > 1 ? 's' : ''} across ${batches.length} batch${
              batches.length > 1 ? 'es' : ''
            }.`
          );
        }
      } catch (err: any) {
        console.error('Batch Sui transfer failed', err);
        appToast.error(err?.message || 'Failed to transfer SUI batch');
      } finally {
        setIsBatchProcessing(false);
        setProcessingId(null);
      }
      return;
    }
    if (selectedNetwork === 'XRP') {
      try {
        ensureExpectedWallet(adminXrp, adminXrpAddress, 'XRP');
      } catch (err: any) {
        appToast.error(err?.message || 'Connect XRP admin wallet first.');
        return;
      }
      let activationResults: Array<{ id: string; walletAddress: string; active: boolean; reason?: string }> = [];
      try {
        activationResults = await validateAddresses('XRP', pendingFiltered);
        if (activationResults.length) {
          applyRemarks(
            activationResults.map((item) => ({
              id: item.id,
              remark: item.active
                ? undefined
                : item.reason || 'Wallet address is not active on ledger. Please activate it on ledger and try again.',
            }))
          );
        }
      } catch (err: any) {
        console.error('XRP address activation check failed', err);
        appToast.error(err?.message || 'Failed to verify XRP wallet activation.');
        return;
      }

      const inactiveXrp = activationResults.filter((item) => !item.active);
      if (inactiveXrp.length) {
        appToast.error(
          `Cannot start XRP batch. Inactive address${inactiveXrp.length > 1 ? 'es' : ''}: ${inactiveXrp
            .map((item) => item.walletAddress)
            .join(', ')}. Please activate them on ledger and try again.`
        );
        return;
      }

      setIsBatchProcessing(true);
      try {
        const batches: WithdrawReq[][] = [];
        for (let i = 0; i < pendingFiltered.length; i += BATCH_LIMIT) {
          batches.push(pendingFiltered.slice(i, i + BATCH_LIMIT));
        }
        const globalSuccess = new Set<string>();
        const globalFailures: BackendBatchResult[] = [];
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          appToast.info(`Processing XRP batch ${i + 1}/${batches.length} (${batch.length} transfers)…`);
          const outcomes = await submitXrpBatch(batch);
          const outcomeMap = new Map(outcomes.map((o) => [o.id, o]));
          const successIds = new Set(outcomes.filter((o) => o.success).map((o) => o.id));
          const failed = outcomes.filter((o) => !o.success);
          successIds.forEach((id) => globalSuccess.add(id));
          globalFailures.push(...failed);
          setRequests((prev) =>
            prev.map((req) => {
              const outcome = outcomeMap.get(req.id);
              if (!outcome) return req;
              if (outcome.success) {
                return {
                  ...req,
                  status: 'transferred' as const,
                  txHash: outcome.txHash || req.txHash,
                  remark: undefined,
                };
              }
              return {
                ...req,
                txHash: outcome.txHash ?? req.txHash,
                remark: outcome.error ? String(outcome.error) : req.remark,
              };
            })
          );
          if (successIds.size) {
            const firstHash = outcomes.find((o) => o.success && o.txHash)?.txHash;
            appToast.success(
              `Completed XRP batch ${i + 1}/${batches.length}${
                firstHash ? ` (e.g. tx: ${firstHash.slice(0, 8)}...)` : ''
              }`
            );
          }
          if (failed.length) {
            appToast.error(
              `Batch ${i + 1} failed for ${failed.length} request${failed.length > 1 ? 's' : ''}: ${failed
                .map((f) => `${f.id}${f.error ? ` (${f.error})` : ''}`)
                .join(', ')}`
            );
          }
        }
        if (globalSuccess.size) {
          appToast.success(
            `Transferred ${globalSuccess.size} XRP request${globalSuccess.size > 1 ? 's' : ''} across ${
              batches.length
            } batch${batches.length > 1 ? 'es' : ''}.`
          );
        }
        if (globalFailures.length) {
          appToast.error(
            `Failed to transfer ${globalFailures.length} XRP request${globalFailures.length > 1 ? 's' : ''}: ${
              globalFailures
                .map((f) => `${f.id}${f.error ? ` (${f.error})` : ''}`)
                .join(', ')
            }`
          );
        }
      } catch (err: any) {
        console.error('Backend batch failed', err);
        appToast.error(err?.message || `Failed to transfer ${selectedNetwork}`);
      } finally {
        setIsBatchProcessing(false);
        setProcessingId(null);
      }
      return;
    }
    setIsBatchProcessing(true);
    const successes: string[] = [];
    const failures: string[] = [];
    try {
      for (const req of pendingFiltered) {
        setProcessingId(req.id);
        try {
          let txid: string | undefined;
          if (selectedNetwork === 'SUI') {
            txid = await transferSui(req);
          } else if (selectedNetwork === 'XRP') {
            txid = await transferXrpViaXaman(req);
          }
          setRequests((prev) =>
            prev.map((x) =>
              x.id === req.id
                ? { ...x, status: 'transferred', txHash: txid || x.txHash, remark: undefined }
                : x
            )
          );
          successes.push(`${req.id}${txid ? ` (${txid.slice(0,8)}…)` : ''}`);
        } catch (err: any) {
          console.error('Batch transfer failed', err);
          failures.push(req.id);
          appToast.error(err?.message || `Failed to transfer ${req.id}`);
        } finally {
          setProcessingId(null);
        }
      }
    } finally {
      setIsBatchProcessing(false);
    }
    if (successes.length) {
      appToast.success(`Transferred ${successes.length} ${selectedNetwork} request${successes.length > 1 ? 's' : ''}.`);
    }
    if (failures.length) {
      appToast.error(`Failed to transfer ${failures.length} ${selectedNetwork} request${failures.length > 1 ? 's' : ''}: ${failures.join(', ')}`);
    }
  }, [
    adminAptos,
    adminSui,
    adminXrp,
    currentSui?.address,
    ensureExpectedWallet,
    launchAptosTransferWindow,
    pendingFiltered,
    selectedNetwork,
    submitXrpBatch,
    transferSui,
    transferSuiBatch,
    transferXrpViaXaman,
    applyRemarks,
    validateAddresses,
  ]);

  const rejectReq = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'rejected', remark: undefined } : x))
    );
    appToast.success("Request rejected");
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sell Intent</h1>

      {/* Admin wallet connections */}
      <div className="grid gap-4 md:grid-cols-3">
        <XamanConnect
          onConnected={(addr) => setAdminXrp(addr)}
          onDisconnected={() => setAdminXrp(null)}
        />
        <ErrorBoundary fallback={
          <section className="rounded-xl border border-black/10 p-4 bg-white/50">
            <h2 className="font-medium mb-2">Connect Sui Wallet</h2>
            <p className="text-sm text-black/70">Sui wallet UI unavailable. Ensure Sui providers are configured.</p>
          </section>
        }>
          <SuiConnect
            onConnected={(addr) => setAdminSui(addr)}
            onDisconnected={() => setAdminSui(null)}
          />
        </ErrorBoundary>
        <AptosConnect
          address={adminAptos || undefined}
          onConnected={(addr) => setAdminAptos(addr)}
          onDisconnected={() => setAdminAptos(null)}
        />
      </div>

      {/* Connection summary */}
      <div className="rounded-xl border border-black/10 p-4 bg-white/50">
        <h2 className="font-medium mb-3">Admin Wallet Status</h2>
        <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:gap-6">
          <WalletStatus
            label="XRP"
            isConnected={Boolean(adminXrp)}
            connectedAddress={adminXrp || undefined}
            adminAddress={adminXrpAddress}
          />
          <WalletStatus
            label="SUI"
            isConnected={Boolean(adminSui)}
            connectedAddress={adminSui || undefined}
            adminAddress={adminSuiAddress}
          />
          <WalletStatus
            label="APTOS"
            isConnected={Boolean(adminAptos)}
            connectedAddress={adminAptos || undefined}
            adminAddress={adminAptosAddress}
          />
        </div>
      </div>

      {/* Network filter */}
      <div className="rounded-xl border border-black/10 bg-white/50 p-4">
        <h2 className="font-medium">Filter by Network</h2>
        <p className="text-sm text-black/60 mb-3">Select a network to show matching sell intent requests.</p>
        <div className="flex flex-wrap gap-2">
          {(["XRP", "SUI", "APTOS"] as WalletName[]).map((option) => {
            const isActive = selectedNetwork === option;
            return (
              <button
                key={option}
                onClick={() => setSelectedNetwork(option)}
                className={`px-4 py-2 rounded-lg text-sm transition border ${
                  isActive
                    ? "bg-black text-white border-black"
                    : "bg-white text-black/70 border-black/10 hover:border-black/20"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dummy requests table */}
      <div className="rounded-xl border border-black/10 overflow-hidden">
        <div className="p-4 bg-white/60 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-medium">Pending Withdrawals</h2>
            <p className="text-sm text-black/60">
              {selectedNetwork
                ? `Approve to transfer ${selectedNetwork} funds from the connected admin wallet.`
                : "Choose a network filter to see requests."}
            </p>
          </div>
          {selectedNetwork && pendingFiltered.length > 0 && (
            <button
              onClick={batchTransfer}
              className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
              disabled={isBatchProcessing || !!processingId}
            >
              {isBatchProcessing ? 'Processing…' : `Transfer all ${selectedNetwork}`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto bg-white/40">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-black/70">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Wallet</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Tx Hash</th>
                <th className="px-4 py-2">Remarks</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedNetwork && filteredRequests.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-2">{r.user}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded px-2 py-0.5 bg-gray-100 text-xs">{r.walletName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.walletAddress.slice(0, 8)}...{r.walletAddress.slice(-6)}
                  </td>
                  <td className="px-4 py-2">
                    {r.amount} {r.walletName}
                  </td>
                  <td className="px-4 py-2">
                    {r.status === "pending" && <span className="text-amber-600">Pending</span>}
                    {r.status === "transferred" && <span className="text-green-600">Transferred</span>}
                    {r.status === "rejected" && <span className="text-red-600">Rejected</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs break-all text-black/80">
                    {r.txHash ? r.txHash : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-red-600 max-w-[12rem] break-words">
                    {r.remark ? r.remark : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.status === "pending" ? (
                      <div className="inline-flex gap-2">
                        <button
                          className="px-3 py-1.5 rounded-md bg-black text-white text-xs disabled:opacity-60"
                          onClick={() => approveAndTransfer(r)}
                          disabled={processingId === r.id}
                        >
                          {processingId === r.id ? "Transferring…" : "Approve & Transfer"}
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-md bg-gray-200 text-xs hover:bg-gray-300"
                          onClick={() => rejectReq(r.id)}
                          disabled={processingId === r.id}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-black/50 text-xs">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
              {selectedNetwork && !filteredRequests.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-black/60">
                    No {selectedNetwork} requests
                  </td>
                </tr>
              )}
              {!selectedNetwork && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-black/60">
                    Select a network above to view sell intent requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-white/60 text-xs text-black/60">
          {!selectedNetwork
            ? "No network selected"
            : filteredRequests.length
              ? anyPending
                ? "Some requests are pending"
                : "All requests processed"
              : `No ${selectedNetwork} requests`}
        </div>
      </div>

      {/* Xaman Payment Modal */}
      {xamanQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="xaman-payment-qr-title">
          <section
            className="relative overflow-hidden rounded-2xl p-5 md:p-6 bg-gradient-to-br from-[#0F172A] via-[#0b1430] to-[#141b3a] text-white shadow-2xl border border-white/10 max-w-md w-[92vw]"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-30 bg-indigo-500" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full blur-3xl opacity-20 bg-fuchsia-500" />

            <button
              onClick={() => {
                setXamanQRModalOpen(false);
                try { xummSocketRef.current?.close(); } catch {}
              }}
              className="absolute right-3 top-3 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4 text-center">
              <h4 id="xaman-payment-qr-title" className="text-xl md:text-2xl font-semibold tracking-tight">
                Sign XRP Payment in Xaman
              </h4>
              <p className="text-sm md:text-[13px] text-white/70 mt-1">
                Scan the QR with Xaman to approve the payment.
              </p>
            </div>

            <div className="mx-auto rounded-2xl p-3 md:p-4 bg-white shadow-lg border border-black/5 max-w-xs">
              {xamanQR ? (
                <img src={xamanQR} alt="Xaman payment QR" className="mx-auto h-60 w-60 object-contain" />
              ) : (
                <div className="h-60 w-60 mx-auto rounded-lg bg-gray-200 animate-pulse" />
              )}
            </div>

            <div className="mt-5 text-center text-xs text-white/60">
              Ensure your phone and computer are online.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children as any;
  }
}

function WalletStatus({
  label,
  isConnected,
  connectedAddress,
  adminAddress,
}: {
  label: WalletName;
  isConnected: boolean;
  connectedAddress?: string;
  adminAddress: string;
}) {
  return (
    <div className="flex flex-col md:flex-1">
      <div className="flex items-center gap-2">
        <span className="text-black/70">{label}:</span>
        <span className={isConnected ? 'text-green-700' : 'text-black/60'}>
          {isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      {connectedAddress && (
        <div className="mt-1 text-black/70">
          Connected
          <div>
            <code className="font-mono bg-gray-100 px-2 py-0.5 rounded inline-block mt-0.5">
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </code>
          </div>
        </div>
      )}
      <div className="mt-1 text-black/70">Admin</div>
      <code className="font-mono bg-gray-100 px-2 py-0.5 rounded inline-block mt-0.5">
        {adminAddress}
      </code>
    </div>
  );
}