import { PrimusNetwork } from '../src/index';
import { ethers } from 'ethers';
import { PrimaryAttestationParams, SubmitTaskReturnParams } from '../src/types/index';
import dotenv from 'dotenv';

describe('PrimusNetwork', () => {
  let primusNetwork: PrimusNetwork;

  beforeEach(() => {
    primusNetwork = new PrimusNetwork();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('init method', () => {
    it('should successfully initialize with signer provider', async () => {
      // Arrange
      const chainId = 84532;
      const mockSignerProvider = {
        _isSigner: true,
        provider: {
          getNetwork: jest.fn().mockResolvedValue({ chainId })
        }
      };

      // Act
      const result = await primusNetwork.init(mockSignerProvider, chainId);

      // Assert
      expect(result).toBe(true);
      expect(mockSignerProvider.provider.getNetwork).toHaveBeenCalled();
    });

    it('should reject with error when provider chainId does not match provided chainId', async () => {
      const providedChainId = 84532;
      const providerChainId = 1; // Different chainId
      const mockSignerProvider = {
        _isSigner: true,
        provider: {
          getNetwork: jest.fn().mockResolvedValue({ chainId: providerChainId })
        }
      };
      await expect(primusNetwork.init(mockSignerProvider, providedChainId))
        .rejects.toBe(`Please connect to the chain with ID ${providedChainId} first.`);
    });
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
        const initResult = await primusNetwork.init(wallet, chainId, "wasm");
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
          url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
          method: "GET",
          header: {},
          body: "",
        }
      ];
      const responseResolves = [
        [
          {
            keyName: "instType",
            parseType: "json",
            parsePath: "$.data[0].instType"
          }
        ]
      ];

      // Compose params for attest
      const attestParams2 = {
        ...attestParams,
        ...submitResult,
        requests,
        responseResolves
      };

      let attestResult = await primusNetwork.attest(attestParams2);
      // Assert
      expect(Array.isArray(attestResult)).toBe(true);
      // The result may be empty if attestation is not fully implemented or attestors are not available
      // But the function should return an array (RawAttestationResultList)
      // Optionally, log the result for manual inspection
      // eslint-disable-next-line no-console
      console.log('Attest result:', attestResult);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Unexpected test error:', error);
        throw error;
      }
    }, 180000); // 30 second timeout for network operations
  });

});