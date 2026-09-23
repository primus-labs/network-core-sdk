import { ethers } from 'ethers';
import { PrimusNetwork, type Logger } from '../src';
import { defaultLogger } from '../src/logger';
import Contract from '../src/classes/Contract';
import { findFastestWs, sendRequest } from '../src/utils';
import { eventReport } from '../src/utils/utils';
import { reportEvent } from '../src/api';
import { init } from '../src/primus_zk';

jest.mock('../src/primus_zk', () => ({ init: jest.fn().mockResolvedValue(true) }));
jest.mock('../src/api', () => ({ reportEvent: jest.fn() }));

const makeLogger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() });

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('configurable SDK logging', () => {
  it('preserves console methods, arguments and no-argument construction', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const details = { taskId: '1' };
    defaultLogger.info('message', details);
    defaultLogger.error('failure', details);
    expect(log).toHaveBeenCalledWith('message', details);
    expect(error).toHaveBeenCalledWith('failure', details);
    expect(new PrimusNetwork().getAesKey('missing')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith("No extended data provided or it's empty");
  });

  it('isolates instance loggers and preserves their method receiver', () => {
    const other = makeLogger();
    const logger: Logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(function (this: Logger) { expect(this).toBe(logger); }),
    };
    const first = new PrimusNetwork({ logger });
    const second = new PrimusNetwork({ logger: other });
    expect(first.getAesKey('missing')).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(other.warn).not.toHaveBeenCalled();
    second.getAesKey('missing');
    expect(other.warn).toHaveBeenCalledTimes(1);
  });

  it('routes parse failures without changing successful or invalid results', () => {
    const logger = makeLogger();
    const sdk = new PrimusNetwork({ logger });
    // Seed the same stored payloads that the attestation path produces.
    Object.assign(sdk, {
      _allPrivateData: { valid: '{"secret":"value"}', invalid: '{' },
      _extendedData: { valid: JSON.stringify({
        CompleteHttpResponseCiphertext: JSON.stringify({ packets: [{ aes_key: 'key' }] }),
      }), invalid: '{', empty: '{}' },
    });
    expect(sdk.getPrivateData('valid', 'secret')).toBe('value');
    expect(sdk.getAesKey('valid')).toBe('key');
    expect(logger.error).not.toHaveBeenCalled();
    expect(sdk.getPrivateData('invalid', 'secret')).toBeUndefined();
    expect(sdk.getAesKey('invalid')).toBeUndefined();
    expect(sdk.getAesKey('empty')).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith('Failed to parse privateData:', expect.any(String));
    expect(logger.error).toHaveBeenCalledWith('Failed to parse extended data:', expect.any(String));
    expect(logger.warn).toHaveBeenCalledWith('No ciphertext found in extended data');
  });

  it('passes the logger through initialization and contract transactions', async () => {
    const logger = makeLogger();
    const sdk = new PrimusNetwork({ logger });
    const provider = new ethers.providers.JsonRpcProvider();
    jest.spyOn(provider, 'getNetwork').mockResolvedValue({ chainId: 84532, name: 'test' });
    await expect(sdk.init(provider, 84532)).resolves.toBe(true);
    expect(init).toHaveBeenCalledWith('auto', {}, logger);
    const receipt = { transactionHash: '0x123' };
    const wait = jest.fn().mockResolvedValue(receipt);
    // Exercise the actual contract wrapper created by SDK initialization.
    const task = (sdk as unknown as { _taskContract: { contractInstance: Contract } })._taskContract;
    const withdrawBalance = jest.fn().mockResolvedValue({ wait });
    task.contractInstance.contractInstance = { withdrawBalance } as unknown as ethers.Contract;
    await expect(task.contractInstance.sendTransaction('withdrawBalance', [0, 1])).resolves.toBe(receipt);
    expect(withdrawBalance).toHaveBeenCalledWith(0, 1);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('sendTransaction params:', 'withdrawBalance', 0, 1);
    const failure = new Error('transaction failed');
    withdrawBalance.mockRejectedValueOnce(failure);
    await expect(task.contractInstance.sendTransaction('withdrawBalance', [0, 1])).rejects.toBe(failure);
    expect(logger.info).toHaveBeenCalledWith('sendTransaction error:', failure);
  });

  it('routes helper logs and preserves request failures and event error handling', async () => {
    const logger = makeLogger();
    await expect(findFastestWs(['example.com'], undefined, logger)).resolves.toBe('example.com');
    expect(logger.info).toHaveBeenCalledWith('findFastestWs', ['example.com']);
    const failure = new Error('offline');
    jest.spyOn(global, 'fetch').mockRejectedValue(failure);
    await expect(sendRequest('https://example.com', undefined, logger)).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith('Request failed:', failure);
    jest.mocked(reportEvent).mockRejectedValue(failure);
    const event = {} as Parameters<typeof eventReport>[0];
    await expect(eventReport(event, logger)).resolves.toBeUndefined();
    expect(reportEvent).toHaveBeenCalledWith(event);
    expect(logger.error).toHaveBeenCalledWith('event report failed:', failure);
  });

  it('preserves production event filtering with a custom logger', async () => {
    const logger = makeLogger();
    const sdk = new PrimusNetwork({ logger });
    const internal = sdk as unknown as {
      chainId: number;
      reportEventIfNeeded: (event: Parameters<typeof eventReport>[0]) => Promise<void>;
    };
    jest.mocked(reportEvent).mockResolvedValue({} as Awaited<ReturnType<typeof reportEvent>>);
    const event = { status: 'SUCCESS' } as Parameters<typeof eventReport>[0];
    internal.chainId = 84532;
    await internal.reportEventIfNeeded(event);
    expect(reportEvent).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    internal.chainId = 8453;
    await internal.reportEventIfNeeded(event);
    expect(reportEvent).toHaveBeenCalledWith(event);
    expect(logger.info).toHaveBeenCalledWith('reportEventIfNeeded', JSON.stringify(event));
    await internal.reportEventIfNeeded({ ...event, status: 'FAILED', detail: { code: '00003', desc: 'skipped' } });
    expect(reportEvent).toHaveBeenCalledTimes(1);
  });
});
