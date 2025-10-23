import { PrimusNetwork } from '../src/index';
import { ethers } from 'ethers';
import { PrimaryAttestationParams, SubmitTaskReturnParams, AttMode } from '../src/types/index';
import dotenv from 'dotenv';

process.env.HTTP_PROXY = "http://127.0.0.1:7890";
process.env.HTTPS_PROXY = "http://127.0.0.1:7890";

describe('PrimusNetwork', () => {
  let primusNetwork: PrimusNetwork;

  beforeEach(() => {
    primusNetwork = new PrimusNetwork();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitTask method', () => {
    it('should successfully initialize and attempt to submit task on Base Sepolia network', async () => {
      // Arrange
      const chainId = 84532; // Base Sepolia
      const baseSepoliaRpcUrl = 'https://sepolia.base.org';

      // Create a real provider for Base Sepolia
      dotenv.config();
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        // eslint-disable-next-line no-console
        console.log('Skipping test: PRIVATE_KEY not set in .env file');
        return;
      }
      const provider = new ethers.providers.JsonRpcProvider(baseSepoliaRpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      // Test parameters
      const testAddress = '0x810b7bacEfD5ba495bB688bbFD2501C904036AB7'; // Example address
      const attestParams: PrimaryAttestationParams = {
        address: testAddress,
      };

      try {
        // Act - Initialize the network with wallet (signer)
        const initResult = await primusNetwork.init(wallet, chainId, "native");
        expect(initResult).toBe(true);

        // Act - Submit task (now with a proper signer)
        let submitResult = await primusNetwork.submitTask(attestParams) as SubmitTaskReturnParams;

        // Assert
        expect(submitResult).toBeDefined();
        expect(submitResult).toHaveProperty('taskId');
        expect(submitResult).toHaveProperty('taskTxHash');
        expect(submitResult).toHaveProperty('taskAttestors');
        expect(typeof submitResult.taskId).toBe('string');
        expect(typeof submitResult.taskTxHash).toBe('string');
        expect(Array.isArray(submitResult.taskAttestors)).toBe(true);

        // eslint-disable-next-line no-console
        console.log('Submit task result:', submitResult);

        // let submitResult = {
        //     taskId: '0x64acec552247298dbd39017a50625f262a38b9de37723bb8b7fa645fda2e2b4d',
        //     taskTxHash: '0x8753e26c144377cb68c1c70f1ea73e2ef1841d9d61381c15307c990e0acf8c61',
        //     taskAttestors: [ '0x93c6331d08a898eb9E08FC9CE91B3Ec60d1735bF' ]
        // };
        const requests = [
          {
            url: "https://edith.xiaohongshu.com/api/sns/web/v1/system/config",
            method: "GET",
            header: {},
            body: "",
          },
          {
            url: "https://edith.xiaohongshu.com/api/sns/web/v1/system/config",
            method: "GET",
            header: {},
            body: "",
          }
        ];

        const responseResolves = [
          [
            {
              keyName: "1",
              parseType: "json",
              parsePath: "$",
              op: "SHA256_EX"
            }
          ],
          [
            {
              keyName: "2",
              parseType: "json",
              parsePath: "$",
              op: "SHA256_EX"
            }
          ]
        ];


        // Compose params for attest
        const attMode = {
          algorithmType: 'mpctls'
        } as AttMode;
        const getAllJsonResponse = "true";
        const attestParams2 = {
          ...attestParams,
          ...submitResult,
          requests,
          responseResolves,
          attMode, getAllJsonResponse
        };

        let attestResult = await primusNetwork.attest(attestParams2);
        expect(Array.isArray(attestResult)).toBe(true);
        console.log('Attest result:', attestResult);
        console.log('Attest result:', JSON.stringify(attestResult));

        const taskResult = await primusNetwork.verifyAndPollTaskResult({
          taskId: attestResult[0].taskId,
          reportTxHash: attestResult[0].reportTxHash
        });
        expect(Array.isArray(taskResult)).toBe(true);
        console.log('Task result:', taskResult);
        {
          const taskId = attestResult[0].taskId;
          const allPlainResponse = primusNetwork.getAllJsonResponse(taskId);
          console.log('allPlainResponse:', allPlainResponse);

          const zkVmRequestData = {
            attestationData: {
              verification_type: "HASH_COMPARSION",
              public_data: attestResult,
              private_data: {
                plain_json_response: allPlainResponse
              }
            },
            requestid: taskId
          };
          console.log("zkVmRequestData=", JSON.stringify(zkVmRequestData));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Unexpected test error:', error);
        throw error;
      }
    }, 180000); // 30 second timeout for network operations
  });

});