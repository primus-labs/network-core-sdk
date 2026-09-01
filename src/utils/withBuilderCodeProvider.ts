import { isBaseBuilderCodeChainId } from '../config/constants';
import { createBuilderDataSuffix, hasBuilderCodeSuffix } from './builderCodeAttribution';

type Hex = `0x${string}`;

type Eip1193RequestArgs = {
  method: string;
  params?: unknown[];
};

type TransactionParams = {
  data?: Hex;
  [key: string]: unknown;
};

type WalletSendCallsParams = {
  calls?: TransactionParams[];
  capabilities?: Record<string, unknown>;
  [key: string]: unknown;
};

type WalletCallsStatus = {
  status?: number;
  receipts?: Array<{
    transactionHash?: Hex;
  }>;
};

type Eip1193Request = (args: Eip1193RequestArgs) => Promise<unknown>;

type LegacyRpcRequest = Eip1193RequestArgs & {
  id?: number;
  jsonrpc?: string;
};

type LegacySendFn = (
  request: LegacyRpcRequest,
  callback: (error: unknown, response: unknown) => void
) => void;

type ChainCapabilities = {
  atomic?: { status?: string };
  dataSuffix?: { supported?: boolean } | boolean;
};

type WalletRpcError = {
  code?: number;
  message?: string;
};

type BuilderCodeContext = {
  builderCodes: string[];
  dataSuffix: Hex;
};

const TRANSACTION_METHODS = new Set([
  'eth_sendTransaction',
  'wallet_sendTransaction',
  'eth_estimateGas'
]);

const UNSUPPORTED_CAPABILITY_CODE = 5700;
const WALLET_CALLS_POLL_INTERVAL = 1_000;
const WALLET_CALLS_MAX_POLLS = 120;

function debugLog(message: string, payload?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;

  if (payload === undefined) {
    console.debug('[builder-code]', message);
    return;
  }
  console.debug('[builder-code]', message, payload);
}

function normalizeChainId(chainId: number | string | undefined): number | undefined {
  if (chainId == null) return undefined;
  if (typeof chainId === 'number') return chainId;

  const caipMatch = String(chainId).match(/:(\d+)$/);
  if (caipMatch) return Number(caipMatch[1]);

  const parsed = Number(chainId);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function concatHex(parts: (string | Hex)[]): Hex {
  const joined = parts
    .map((part) => {
      if (part === '0x') return '';
      return part.startsWith('0x') ? part.slice(2) : part;
    })
    .join('');
  return `0x${joined}` as Hex;
}

function appendSuffix(data: string | undefined, context: BuilderCodeContext): Hex {
  if (hasBuilderCodeSuffix(data, context.builderCodes)) {
    return (data ?? '0x') as Hex;
  }

  return concatHex([(data ?? '0x') as Hex, context.dataSuffix]);
}

function patchTransactionParams(
  params: unknown[] | undefined,
  context: BuilderCodeContext
): unknown[] | undefined {
  if (!params?.length) return params;

  const tx = params[0] as TransactionParams | undefined;
  if (!tx || typeof tx !== 'object') return params;

  return [{ ...tx, data: appendSuffix(tx.data, context) }, ...params.slice(1)];
}

function patchWalletSendCallsParams(
  params: unknown[] | undefined,
  context: BuilderCodeContext
): unknown[] | undefined {
  if (!params?.length) return params;

  const payload = params[0] as WalletSendCallsParams | undefined;
  if (!payload || typeof payload !== 'object') return params;

  return [
    {
      ...payload,
      capabilities: {
        ...(payload.capabilities ?? {}),
        dataSuffix: {
          value: context.dataSuffix,
          optional: true
        }
      }
    },
    ...params.slice(1)
  ];
}

function getBatchId(result: unknown): string | undefined {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return undefined;

  const response = result as {
    batchId?: string;
    id?: string;
  };
  return response.batchId ?? response.id;
}

function getCallsStatus(result: unknown): WalletCallsStatus {
  if (!result || typeof result !== 'object') return {};

  const response = result as WalletCallsStatus & {
    result?: WalletCallsStatus;
  };
  return response.result ?? response;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUnsupportedCapabilityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const rpcError = error as WalletRpcError;
  if (rpcError.code === UNSUPPORTED_CAPABILITY_CODE) return true;

  return (
    typeof rpcError.message === 'string' &&
    rpcError.message.includes('Unsupported non-optional capabilities')
  );
}

async function getWalletCapabilities(
  originalRequest: Eip1193Request,
  target: object,
  from: string,
  chainIdHex: string
): Promise<ChainCapabilities | undefined> {
  try {
    const result = await originalRequest.call(target, {
      method: 'wallet_getCapabilities',
      params: [from, [chainIdHex]]
    });
    return (result as Record<string, ChainCapabilities> | undefined)?.[chainIdHex];
  } catch {
    return undefined;
  }
}

function supportsWalletSendCalls(capabilities?: ChainCapabilities): boolean {
  const status = capabilities?.atomic?.status;
  return status === 'supported' || status === 'ready';
}

function supportsDataSuffixCapability(capabilities?: ChainCapabilities): boolean {
  const dataSuffix = capabilities?.dataSuffix;
  if (dataSuffix === true) return true;
  if (!dataSuffix || typeof dataSuffix !== 'object') return false;
  return dataSuffix.supported === true;
}

async function waitForCallsTransactionHash(
  originalRequest: Eip1193Request,
  target: object,
  batchId: string
): Promise<Hex> {
  for (let attempt = 0; attempt < WALLET_CALLS_MAX_POLLS; attempt += 1) {
    const result = await originalRequest.call(target, {
      method: 'wallet_getCallsStatus',
      params: [batchId]
    });
    const status = getCallsStatus(result);
    const transactionHash = status.receipts?.[0]?.transactionHash;

    if (transactionHash) {
      debugLog('wallet_sendCalls confirmed', {
        batchId,
        transactionHash
      });
      return transactionHash;
    }

    if (typeof status.status === 'number' && status.status >= 400) {
      throw new Error(`wallet_sendCalls failed with status ${status.status}`);
    }

    await delay(WALLET_CALLS_POLL_INTERVAL);
  }

  throw new Error('Timed out waiting for wallet_sendCalls receipt');
}

async function sendWithDataSuffixCapability(
  originalRequest: Eip1193Request,
  target: object,
  tx: TransactionParams,
  chainId: number,
  context: BuilderCodeContext
): Promise<Hex | undefined> {
  const from = typeof tx.from === 'string' ? tx.from : undefined;
  const to = typeof tx.to === 'string' ? tx.to : undefined;
  if (!from || !to) return undefined;

  const chainIdHex = `0x${chainId.toString(16)}`;
  const capabilities = await getWalletCapabilities(originalRequest, target, from, chainIdHex);

  debugLog('wallet capabilities', {
    chainId: chainIdHex,
    atomic: capabilities?.atomic?.status,
    dataSuffix: capabilities?.dataSuffix
  });

  if (!supportsWalletSendCalls(capabilities) || !supportsDataSuffixCapability(capabilities)) {
    debugLog('wallet_sendCalls dataSuffix unavailable, using eth_sendTransaction fallback');
    return undefined;
  }

  debugLog('sending with wallet_sendCalls dataSuffix capability', {
    chainId: chainIdHex,
    selector: tx.data?.slice(0, 10)
  });

  try {
    const result = await originalRequest.call(target, {
      method: 'wallet_sendCalls',
      params: [
        {
          version: '2.0.0',
          from,
          chainId: chainIdHex,
          atomicRequired: false,
          calls: [
            {
              to,
              value: typeof tx.value === 'string' ? tx.value : '0x0',
              data: tx.data ?? '0x'
            }
          ],
          capabilities: {
            dataSuffix: {
              value: context.dataSuffix,
              optional: false
            }
          }
        }
      ]
    });

    const batchId = getBatchId(result);
    if (!batchId) {
      throw new Error('wallet_sendCalls did not return a batch ID');
    }

    return waitForCallsTransactionHash(originalRequest, target, batchId);
  } catch (error) {
    if (isUnsupportedCapabilityError(error)) {
      debugLog('wallet rejected dataSuffix capability, using eth_sendTransaction fallback', error);
      return undefined;
    }
    throw error;
  }
}

function patchRpcPayload(
  method: string,
  params: unknown[] | undefined,
  context: BuilderCodeContext
): unknown[] | undefined {
  if (method === 'wallet_sendCalls') {
    return patchWalletSendCallsParams(params, context);
  }

  if (TRANSACTION_METHODS.has(method)) {
    return patchTransactionParams(params, context);
  }

  return params;
}

function logRpcPatch(method: string, params: unknown[] | undefined, builderCodes: string[]): void {
  const tx = params?.[0] as TransactionParams | undefined;
  const calls = (params?.[0] as WalletSendCallsParams | undefined)?.calls;

  debugLog(`intercepted ${method}`, {
    selector: tx?.data?.slice(0, 10),
    dataLength: tx?.data?.length,
    callCount: calls?.length,
    alreadyHasSuffix: hasBuilderCodeSuffix(tx?.data, builderCodes)
  });
}

function wrapRpcPayload(
  method: string,
  params: unknown[] | undefined,
  context: BuilderCodeContext
): unknown[] | undefined {
  const patched = patchRpcPayload(method, params, context);
  if (patched === params) return params;

  logRpcPatch(method, patched, context.builderCodes);
  return patched;
}

function wrapLegacySend(
  original: LegacySendFn,
  target: object,
  context: BuilderCodeContext
): LegacySendFn {
  return (request, callback) => {
    const params = wrapRpcPayload(request.method, request.params, context);
    if (params === request.params) {
      return original.call(target, request, callback);
    }

    return original.call(target, { ...request, params }, callback);
  };
}

/**
 * Wrap an EIP-1193 provider so transactions append Base Builder Code (ERC-8021).
 * Active on Base mainnet (8453) and Base Sepolia (84532).
 */
export function withBuilderCodeProvider<T extends object>(
  provider: T,
  chainId: number | string | undefined,
  builderCodes: string[]
): T {
  const normalizedChainId = normalizeChainId(chainId);
  if (
    normalizedChainId === undefined ||
    !isBaseBuilderCodeChainId(normalizedChainId) ||
    builderCodes.length === 0
  ) {
    debugLog('skipped wrapper', { chainId, normalizedChainId, builderCodes });
    return provider;
  }

  const context: BuilderCodeContext = {
    builderCodes,
    dataSuffix: createBuilderDataSuffix(builderCodes)
  };

  debugLog('enabled wrapper', { chainId: normalizedChainId, builderCodes });

  return new Proxy(provider, {
    get(target, property, receiver) {
      if (property === 'request') {
        const originalRequest = Reflect.get(target, property, receiver) as
          | ((args: Eip1193RequestArgs) => Promise<unknown>)
          | undefined;

        if (!originalRequest) {
          return undefined;
        }

        return async (args: Eip1193RequestArgs) => {
          if (args.method === 'eth_sendTransaction') {
            const tx = args.params?.[0] as TransactionParams | undefined;
            if (tx && typeof tx === 'object') {
              const transactionHash = await sendWithDataSuffixCapability(
                originalRequest,
                target,
                tx,
                normalizedChainId,
                context
              );
              if (transactionHash) return transactionHash;
            }
          }

          const params = wrapRpcPayload(args.method, args.params, context);
          if (params === args.params) {
            return originalRequest.call(target, args);
          }

          return originalRequest.call(target, { ...args, params });
        };
      }

      if (property === 'send' || property === 'sendAsync') {
        const originalSend = Reflect.get(target, property, receiver) as LegacySendFn | undefined;

        if (!originalSend) {
          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        }

        return wrapLegacySend(originalSend, target, context);
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}
