import api from '@/api/queryClient';
import { endpoints } from '@/api/endpoints';

export async function createXamanPayload(payload: any = {}) {
  
  const tryRoutes = [endpoints.web3.createXamanPayload, endpoints.web3.createXamanPayload.replace('/internal/', '/external/')];
  let lastErr: any = null;
  for (const route of tryRoutes) {
    try {
      const res = await api.post(route, payload);
      const env = res?.data;
      if (env?.success === false) throw new Error(env?.message || 'Create failed');
      const data = env?.data ?? env;
      const { uuid, next, refs } = data || {};
      const websocketStatus = data?.websocketStatus || data?.refs?.websocket_status;
      if (!uuid) {
        const msg = env?.message || 'No uuid in response';
        throw new Error(`Missing uuid from backend (route: ${route}) - ${msg}`);
      }
      const qrPng = refs?.qr_png || refs?.qrPng || refs?.qr_png_64 || null;
      return { uuid, next, qrPng, websocketStatus } as {
        uuid: string;
        next?: any;
        qrPng?: string | null;
        websocketStatus?: string;
      };
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('Failed to create Xaman payload');
}

export async function getXamanPayload(uuid: string) {
  const tryRoutes = [endpoints.web3.getXamanPayload(uuid), endpoints.web3.getXamanPayload(uuid).replace('/internal/', '/external/')];
  let lastErr: any = null;
  for (const route of tryRoutes) {
    try {
      const res = await api.get(route);
      const env = res?.data;
      return env?.data ?? env;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('Failed to fetch Xaman payload');
}

export async function waitForXamanAccount(
  uuid: string,
  opts?: {
    initialDelayMs?: number;
    maxAttempts?: number;
    factor?: number;
    jitter?: number;
    signal?: AbortSignal;
  }
) {
  const initialDelayMs = opts?.initialDelayMs ?? 1200;
  const maxAttempts = opts?.maxAttempts ?? 6;
  const factor = opts?.factor ?? 1.6;
  const jitter = Math.max(0, Math.min(1, opts?.jitter ?? 0.25));
  const signal = opts?.signal;

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      const onAbort = () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); };
      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  await sleep(initialDelayMs);

  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const payload = await getXamanPayload(uuid);
    const d = payload?.data ?? payload;
    const account =
      d?.response?.account ??
      d?.account ??
      d?.payload?.response?.account ??
      d?.signer?.account ??
      null;

    if (account) return account as string;
    if (d?.response?.signed === false || d?.meta?.signed === false)
      throw new Error('User rejected in Xaman');
    if (d?.meta?.expired || d?.expired)
      throw new Error('Xaman request expired');

    if (attempt < maxAttempts) {
      const rand = 1 + (Math.random() * 2 - 1) * jitter;
      delay = Math.round(delay * factor * rand);
      await sleep(delay);
    }
  }
  throw new Error('Timed out waiting for XRPL address');
}
