import { useCallback, useMemo, useRef, useState } from "react";
import { appToast } from "@/utils/toast";
import api from "@/api/queryClient";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import XamanConnect from "@/components/walletconnect/xamanconnect";
import SuiConnect from "@/components/walletconnect/suiconnect";
import AptosConnect from "@/components/walletconnect/aptosconnect";
import React from "react";
import { createXamanPayload, getXamanPayload } from "@/lib/xaman";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { endpoints } from "@/api/endpoints";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { cn } from "@/lib/utils";
<<<<<<< HEAD
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { env } from "process";
import { CustomModal } from "@/components/modals/custom-modal";
import { Send } from "lucide-react";
=======
import { assetSpecs } from "@/utils/asset";
>>>>>>> vamsi

export const generateStatus = (status: string) => {
  return (
    <p
      className={cn({
        "text-red-500": status === "REJECT",
        "text-green-500": status === "APPROVE",
        "text-yellow-500": status === "PENDING",
      })}
    >
      {status === "REJECT" && "REJECTED"}
      {status === "APPROVE" && "APPROVED"}
      {status === "PENDING" && "PENDING"}
    </p>
  );
};
type WalletName = "XRP" | "SUI" | "APTOS";

type WithdrawReq = {
  _id: string;
  user: string;
  walletName: WalletName;
  walletAddress: string;
  parentAmountVal: string;
  amount: number; // in network unit for simplicity
  status: "pending" | "transferred" | "rejected";
  metadata: {
    amount: string;
  },
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
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false);
  const BATCH_LIMIT = 50;

  // Sui hooks
  const currentSui = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const adminSuiAddress = import.meta.env.VITE_ADMIN_SUI_ADDRESS;
  const adminXrpAddress = import.meta.env.VITE_ADMIN_XRP_ADDRESS;
  const adminAptosAddress = import.meta.env.VITE_ADMIN_APTOS_ADDRESS;
  // Xaman (XRP) payment modal state
  const [xamanQRModalOpen, setXamanQRModalOpen] = useState(false);
  const [xamanQR, setXamanQR] = useState<string | undefined>(undefined);
  const xummSocketRef = useRef<WebSocket | null>(null);
  const activeUuidRef = useRef<string | null>(null);
  const [page ] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const url = `${endpoints.entities.assetLedger.sellIntentAdmin}?page=${page}&pageSize=${pageSize}&status=PENDING`;
  const { data } = useApiQuery(url, { keepPreviousData: true });

  const entries = useMemo(() => data?.data?.data?.items ?? [], [data]);

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const isValidXrplClassic = (addr: string) => /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/.test(addr);
  const isValidAptosAddress = (addr: string) => /^0x[0-9a-fA-F]{1,64}$/.test(addr);

  const actions = useCallback((id: string) => [
    {
      label: 'Approve',
      onClick: () => {
        // Add your approve logic here
        console.log('Approve', id);
      },
    },
    {
      label: 'Reject',
      onClick: () => {
        // Add your reject logic here
        console.log('Reject', id);
      },
    },
  ], []);

  const tableData = useMemo(
    () =>
      entries.map((r: any) => {
        const intentLeg = r.legs?.find((l) => {
          return l?.legType === "intent-amount";
        });

        const status = r.metadata?.status;
        const parentAmountVal = unwrapString(
          amount({
            op: "toParent",
            assetId: intentLeg?.assetId,
            value: intentLeg?.amount,
            output: "string",
            trim: true,
            group: false,
          })
        );
        return {
          ...r,
          username: r.metadata?.username,
          walletAddress: r.metadata?.walletAddress,
          chain: r.metadata?.chain,
          assetId:
            assetSpecs[intentLeg?.assetId]?.parentSymbol ?? intentLeg?.assetId,
          parentAmountVal,
          status: generateStatus(status),
          tableOptions:
            status === "PENDING" ? (
              <ThreeDotMenu actions={actions(r._id)} />
            ) : null,
        };
      }),
    [entries]
  );

  console.log("tableData", tableData);

  const filteredRequests = useMemo(() => {
    if (!selectedNetwork) return [];
    return tableData.filter((r) => r.metadata?.chain === selectedNetwork);
  }, [tableData, selectedNetwork]);

  const pendingFiltered = useMemo(
    () => filteredRequests.filter((r) => r.metadata?.status === "PENDING"),
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

  const applyRemarks = useCallback((entries: Array<{ _id: string; remark?: string }>) => {
    if (!entries.length) return;
    const remarkMap = new Map(entries.map((entry) => [entry._id, entry.remark]));
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
            addresses: items.map(({ _id, walletAddress }) => ({ id: String(_id), walletAddress })),
          },
          { signal: controller.signal }
        );
        return (data?.data?.results ?? []) as Array<{
          _id: string;
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
    const totalMist = items.reduce((sum, req) => sum + toMist(Number(req.parentAmountVal)), 0n);
    const buffer = baseSuiBuffer + BigInt(items.length) * BigInt(5e7); // extra per transfer
    await ensureSuiFunds(totalMist + buffer);

    const coins = items.map((req) => {
      const mist = toMist(Number(req.parentAmountVal));
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
          transfers: items.map(({ _id, walletAddress, parentAmountVal }) => ({ id: String(_id), walletAddress, amount: Number(parentAmountVal) })),
        },
        { signal: controller.signal }
      );
      console.log(data);
      appToast.success('Batch transfer request submitted successfully');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Batch transfer request timed out. Please retry or check backend connectivity.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const submitAptosBatch = useCallback(async (items: WithdrawReq[]) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const { data } = await api.post(
        `${import.meta.env.VITE_APTOS_TRANSFER_BASE_URL}/aptos/transfer/batch`,
        {
          network: 'APTOS',
          transfers: items.map(({ _id, walletAddress, parentAmountVal }) => ({ ref: String(_id), to: walletAddress, amount: Number(parentAmountVal) })),
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

  const { mutateAsync: approveSellIntentMutation } = useApiMutation<{ actionIds: string[] }, { approvedIds: string[] }>({
    route: '/internal/actions/bulk-sell-intent-approve',
    method: 'POST',
    onSuccess: (data: { approvedIds: string[] }) => {
      const ids = data?.approvedIds || [];
      if (ids.length > 0) {
        appToast.success(`Successfully approved ${ids.length} sell intent${ids.length > 1 ? 's' : ''}`);
      }
    },
    onError: (error: any) => {
      console.error('Failed to approve sell intent:', error);
      appToast.error('Failed to approve sell intent');
    },
  });

  const bulkApproveSellIntents = useCallback(async (actionItems: Array<{ actionId: string; txnHash: string }>) => {
    if (!actionItems.length) return;
    
    try {
      setIsBatchProcessing(true);
      // Ensure each item has both actionId and txnHash
      const payload = actionItems.map(item => ({
        actionId: item.actionId,
        txnHash: item.txnHash || '' // Ensure txnHash is always a string, even if empty
      }));
      
      await approveSellIntentMutation({ actionIds: payload });
    } finally {
      setIsBatchProcessing(false);
    }
  }, [approveSellIntentMutation]);

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
      setIsBatchProcessing(true);
      const invalid = pendingFiltered.filter((req) => !isValidAptosAddress(req.walletAddress));
      if (invalid.length) {
        appToast.error(`Invalid Aptos address${invalid.length > 1 ? 'es' : ''}: ${invalid.map((r) => r.id).join(', ')}`);
        return;
      }

      let activationResults: Array<{ id: string; walletAddress: string; active: boolean; reason?: string }> = [];
      try {
          applyRemarks(
            activationResults.map((item) => ({
              _id: item.id,
              remark: item.active
                ? undefined
                : item.reason || 'Wallet address is not active on ledger. Please activate it on ledger and try again.',
            }))
          );
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
        const batches: WithdrawReq[][] = [];
        for (let i = 0; i < pendingFiltered.length; i += BATCH_LIMIT) {
          batches.push(pendingFiltered.slice(i, i + BATCH_LIMIT));
        }
        const globalSuccess = new Set<string>();
        const globalFailures: BackendBatchResult[] = [];
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          appToast.info(`Processing APTOS batch ${i + 1}/${batches.length} (${batch.length} transfers)…`);

          await submitAptosBatch(batch);
          
        }
        if (globalSuccess.size) {
          appToast.success(
            `Transferred ${globalSuccess.size} Aptos request${globalSuccess.size > 1 ? 's' : ''} across ${
              batches.length
            } batch${batches.length > 1 ? 'es' : ''}.`
          );
        }
        if (globalFailures.length) {
          appToast.error(
            `Failed to transfer ${globalFailures.length} Aptos request${globalFailures.length > 1 ? 's' : ''}: ${
              globalFailures
                .map((f) => `${f.id}${f.error ? ` (${f.error})` : ''}`)
                .join(', ')
            }`
          );
        }
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
          appToast.info(`Processing SUI batch ${i + 1}/${batches.length} (${batch.length} transfers)…`);
          const txid = await transferSuiBatch(batch);
          console.log("txid", txid);
          const approvePayload = batch.map(req => ({
            actionId: req._id,
            txnHash: txid // Using the transaction ID from the batch transfer
          }));
          
          // Call bulkApproveSellIntents with the properly formatted payload
          await bulkApproveSellIntents(approvePayload);

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
      setIsBatchProcessing(true);
      let activationResults: Array<{ id: string; walletAddress: string; active: boolean; reason?: string }> = [];
      console.log('pendingFiltered', pendingFiltered);
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

      try {
        const batches: WithdrawReq[][] = [];
        for (let i = 0; i < pendingFiltered.length; i += BATCH_LIMIT) {
          batches.push(pendingFiltered.slice(i, i + BATCH_LIMIT));
        }
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          appToast.info(`Processing XRP batch ${i + 1}/${batches.length} (${batch.length} transfers)…`);
          await submitXrpBatch(batch);
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
    pendingFiltered,
    selectedNetwork,
    submitXrpBatch,
    transferSui,
    transferSuiBatch,
    transferXrpViaXaman,
    applyRemarks,
    validateAddresses,
  ]);

  const handleConfirmTransfer = useCallback(async () => {
    setConfirmTransferOpen(false);
    await batchTransfer();
  }, [batchTransfer]);

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
        <div className="flex flex-col gap-4 bg-white/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-black">Pending Withdrawals</h2>
            <p className="mt-1 text-base text-black/70 max-w-2xl">
              {selectedNetwork
                ? `Approve transfers for ${selectedNetwork} sell intents using the connected admin wallet.`
                : "Select a network to review pending sell intent requests."}
            </p>
          </div>
          <div className="flex items-center gap-4 text-base text-black/70">
            <span className="rounded-full bg-black/5 px-4 py-1.5">
              {anyPending ? `${pendingFiltered.length} pending` : 'All processed'}
            </span>
            {selectedNetwork && pendingFiltered.length > 0 && (
              <button
                onClick={() => setConfirmTransferOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/30"
                disabled={isBatchProcessing || !!processingId}
              >
                <Send className="h-4 w-4" />
                {isBatchProcessing ? 'Processing…' : `Transfer all ${selectedNetwork}`}
              </button>
            )}
          </div>
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
              </tr>
            </thead>
            <tbody>
              {selectedNetwork && filteredRequests.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{r._id}</td>
                  <td className="px-4 py-2">{r.metadata.username}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded px-2 py-0.5 bg-gray-100 text-xs">{r.metadata.chain}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.walletAddress.slice(0, 8)}...{r.walletAddress.slice(-6)}
                  </td>
                  <td className="px-4 py-2">
                    {r.parentAmountVal} {r.metadata.currency}
                  </td>
                  <td className="px-4 py-2">
                    {r.metadata.status === "PENDING" && <span className="text-amber-600">Pending</span>}
                    {r.metadata.status === "TRANSFERRED" && <span className="text-green-600">Transferred</span>}
                    {r.metadata.status === "REJECTED" && <span className="text-red-600">Rejected</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs break-all text-black/80">
                    {r.metadata.txHash ? r.metadata.txHash : '—'}
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
      <CustomModal
        isOpen={confirmTransferOpen}
        onClose={() => setConfirmTransferOpen(false)}
        title="Confirm batch transfer"
        onSubmit={handleConfirmTransfer}
        submitButtonText={isBatchProcessing ? 'Processing…' : 'Confirm transfer'}
        submitButtonClass="bg-black text-white"
        isSubmitting={isBatchProcessing}
        needX
      >
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-black via-black/95 to-black px-6 py-7 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Batch transfer</p>
                <p className="text-xl font-semibold">{selectedNetwork ?? 'Select a network'} payout</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base">
                <p className="text-white/50 text-xs uppercase tracking-wider">Pending requests</p>
                <p className="text-2xl font-semibold text-white">{pendingFiltered.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base">
                <p className="text-white/50 text-xs uppercase tracking-wider">Admin wallet</p>
                <p className="text-white truncate font-semibold">{selectedNetwork ? `${selectedNetwork} wallet` : '—'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-base text-amber-900">
            <p className="text-lg font-semibold">Review before you send</p>
            <p className="mt-1 text-amber-800/80">
              Ensure sufficient balance is available in the connected admin wallet and double-check all wallet addresses.
              This action will initiate on-chain transfers for every pending request.
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-white px-5 py-4 text-sm text-black/70">
            <p className="text-lg font-semibold text-black">What happens next?</p>
            <ul className="mt-2 space-y-1.5">
              <li>• Each request is processed sequentially with the configured delays.</li>
              <li>• Successes are marked automatically on completion.</li>
              <li>• Any failures will surface in the activity feed for review.</li>
            </ul>
          </div>
        </div>
      </CustomModal>
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