import {
  BASE_MAINNET_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
} from '../src/config/constants';
import { BASE_BUILDER_CODES } from '../src/config/builderCodes';
import {
  appendBuilderCodeToTxData,
  createBuilderDataSuffix,
  hasBuilderCodeSuffix,
} from '../src/utils/builderCodeAttribution';
import { withBuilderCodeProvider } from '../src/utils/withBuilderCodeProvider';
import { withBuilderCodeSigner } from '../src/utils/withBuilderCodeSigner';

describe('builderCodeAttribution', () => {
  const builderCodes = ['bc_test123'];

  it('creates ERC-8021 suffix ending with schema marker', () => {
    const suffix = createBuilderDataSuffix(builderCodes);
    expect(suffix.endsWith('80218021802180218021802180218021')).toBe(true);
    expect(suffix.startsWith('0x')).toBe(true);
  });

  it('detects appended builder code suffix', () => {
    const suffix = createBuilderDataSuffix(builderCodes);
    const txData = `0xdeadbeef${suffix.slice(2)}`;
    expect(hasBuilderCodeSuffix(txData, builderCodes)).toBe(true);
    expect(hasBuilderCodeSuffix('0xdeadbeef', builderCodes)).toBe(false);
  });

  it('appends suffix via appendBuilderCodeToTxData', () => {
    const patched = appendBuilderCodeToTxData('0xabc', builderCodes);
    expect(hasBuilderCodeSuffix(patched, builderCodes)).toBe(true);
  });
});

describe('withBuilderCodeSigner', () => {
  it('appends suffix when sendTransaction is called on Base mainnet', async () => {
    const sendTransaction = jest.fn().mockResolvedValue({ hash: '0xhash' });
    const innerSigner = {
      _isSigner: true,
      provider: {},
      getAddress: jest.fn().mockResolvedValue('0x1'),
      sendTransaction,
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
      connect: jest.fn(),
    };

    const wrapped = withBuilderCodeSigner(
      innerSigner as unknown as import('ethers').Signer,
      BASE_MAINNET_CHAIN_ID,
      [...BASE_BUILDER_CODES]
    );

    await wrapped.sendTransaction({
      to: '0x2',
      data: '0xabcd',
    });

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    const patchedTx = sendTransaction.mock.calls[0][0];
    expect(hasBuilderCodeSuffix(patchedTx.data, [...BASE_BUILDER_CODES])).toBe(true);
  });
});

describe('withBuilderCodeProvider', () => {
  const builderCodes = ['bc_test123'];

  it('skips wrapper on non-Base chains', async () => {
    const provider = {
      request: jest.fn().mockResolvedValue('0xhash')
    };

    const wrapped = withBuilderCodeProvider(provider, 1, builderCodes);
    expect(wrapped).toBe(provider);

    await wrapped.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0x1', to: '0x2', data: '0xabc' }]
    });

    expect(provider.request).toHaveBeenCalledWith({
      method: 'eth_sendTransaction',
      params: [{ from: '0x1', to: '0x2', data: '0xabc' }]
    });
  });

  it.each([BASE_MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID])(
    'appends suffix on Base chain %i eth_sendTransaction',
    async (chainId) => {
      const provider = {
        request: jest.fn().mockResolvedValue('0xhash')
      };

      const wrapped = withBuilderCodeProvider(provider, chainId, builderCodes);

      await wrapped.request({
        method: 'eth_sendTransaction',
        params: [{ from: '0x1', to: '0x2', data: '0xabc' }]
      });

      const sendCall = provider.request.mock.calls.find(
        ([args]) => args.method === 'eth_sendTransaction'
      );
      expect(sendCall).toBeDefined();
      expect(hasBuilderCodeSuffix(sendCall![0].params[0].data, builderCodes)).toBe(true);
    }
  );
});
