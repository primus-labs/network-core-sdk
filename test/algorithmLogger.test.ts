import { init, getAttestation } from '../src/primus_zk';

const mockCallAlgorithm = jest.fn().mockResolvedValue('{"retcode":"0"}');
const mockCwrap = jest.fn((..._args: unknown[]) => mockCallAlgorithm);

jest.mock('../src/algorithm/client_plugin.js', () => ({
  cwrap: (...args: unknown[]) => mockCwrap(...args),
  set onRuntimeInitialized(callback: () => void) { callback(); },
}));

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it('routes WASM initialization logs and preserves algorithm calls and version', async () => {
  jest.useFakeTimers();
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  await expect(init('wasm', { algorithmVersion: 'test-version' }, logger)).resolves.toBe('{"retcode":"0"}');
  expect(logger.info).toHaveBeenCalledWith('[info] WASM module initialized.');
  expect(mockCallAlgorithm.mock.calls.map(([params]) => JSON.parse(params))).toEqual([
    { method: 'setLogLevel', version: 'test-version', params: { logLevel: 'error' } },
    { method: 'init', version: 'test-version', params: {} },
  ]);
  await expect(getAttestation({ requestid: '1' })).resolves.toEqual({ retcode: '0' });
  expect(JSON.parse(mockCallAlgorithm.mock.calls[2][0])).toEqual({
    method: 'getAttestation', version: 'test-version', params: { requestid: '1' },
  });
});

it('preserves WASM initialization errors and sends them to the custom logger', async () => {
  jest.useFakeTimers();
  const failure = new Error('cwrap failed');
  mockCwrap.mockImplementationOnce(() => { throw failure; });
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  await expect(init('wasm', {}, logger)).rejects.toBe(failure);
  expect(logger.error).toHaveBeenCalledWith('[error] cwrap failed:', failure);
});
