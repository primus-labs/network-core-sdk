import { PrimusNetwork } from '../src/index';
import { ethers } from 'ethers';
import { PrimaryAttestationParams, SubmitTaskReturnParams } from '../src/types/index';
import dotenv from 'dotenv';

describe('PrimusNetwork (Base Mainnet, chainId 8453)', () => {
  let primusNetwork: PrimusNetwork;

  beforeEach(() => {
    primusNetwork = new PrimusNetwork();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitTask method', () => {
    it('should successfully initialize and attempt to submit task on Base Mainnet', async () => {
      const chainId = 8453;
      const baseMainnetRpcUrl = 'https://mainnet.base.org';

      dotenv.config();
      const privateKey = process.env.PRIVATE_KEY;
      const appName = process.env.APP_NAME;
      if (!privateKey) {
        // eslint-disable-next-line no-console
        console.log('Skipping test: PRIVATE_KEY not set in .env file');
        return;
      }
      const provider = new ethers.providers.JsonRpcProvider(baseMainnetRpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const testAddress = '0x8F0D4188307496926d785fB00E08Ed772f3be890';
      const attestParams: PrimaryAttestationParams = {
        address: testAddress,
      };

      try {
        const initResult = await primusNetwork.init(wallet, chainId, 'native', appName);
        expect(initResult).toBe(true);
        const submitResult = await primusNetwork.submitTask(attestParams) as SubmitTaskReturnParams;
        expect(submitResult).toBeDefined();
        expect(submitResult).toHaveProperty('taskId');
        expect(submitResult).toHaveProperty('taskTxHash');
        expect(submitResult).toHaveProperty('taskAttestors');
        expect(typeof submitResult.taskId).toBe('string');
        expect(typeof submitResult.taskTxHash).toBe('string');
        expect(Array.isArray(submitResult.taskAttestors)).toBe(true);

        // eslint-disable-next-line no-console
        console.log('Submit task result:', submitResult);

        const requests = [
          {
            url: 'https://postman-echo.com/post',
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
            },
            body: {
              foo: 'bar',
            },
          },
        ];
        const responseResolves = [
          [
            {
              keyName: 'data',
              parseType: 'json',
              parsePath: '$.data',
              op: 'SHA256_EX',
            },
          ],
        ];

        const attestParams2 = {
          ...attestParams,
          ...submitResult,
          requests,
          responseResolves,
          extendedParams: JSON.stringify({ attUrlOptimization: true }),
        };

        const attestResult = await primusNetwork.attest(attestParams2);
        expect(Array.isArray(attestResult)).toBe(true);

        const taskResult = await primusNetwork.verifyAndPollTaskResult({
          taskId: attestResult[0].taskId,
          reportTxHash: attestResult[0].reportTxHash,
        });
        expect(Array.isArray(taskResult)).toBe(true);
        // eslint-disable-next-line no-console
        console.log('Task result:', taskResult);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Unexpected test error:', error);
        throw error;
      }
    }, 180000);
  });
});
