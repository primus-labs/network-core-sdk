import { PrimusNetwork } from '../src/index';
import { ethers } from 'ethers';
import { PrimaryAttestationParams, SubmitTaskReturnParams } from '../src/types/index';
import dotenv from 'dotenv';
import {  sha256 } from "../src/utils";


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
      const testAddress = '0x8F0D4188307496926d785fB00E08Ed772f3be890'; // Example address
      const attestParams: PrimaryAttestationParams = {
        address: testAddress
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
            url: "https://www.federalreserve.gov/monetarypolicy/openmarket.htm",
            method: "GET",
            header: {},
            body: "",
            }
        ];
        // /html/body/div[4]/div[2]/div[1]/div[1]
        const dataXPath = '/html/body/div[4]/div[2]/div[1]/div[1]/table/tbody'
        const yearXPath = '//*[@id="content"]/div[2]/div/h4[2]'
        const responseResolves = [
            [
              {
                keyName: "year",
                parseType: "html",
                parsePath: yearXPath,
                op: 'SHA256_EX'
              },
              {
                keyName: "data",
                parseType: "html",
                parsePath: dataXPath,
                op: 'SHA256_EX'
              },
            ]
        ];

        // Compose params for attest
        // const mTLS = {
        //   clientCrt: "YourClientCrtString", // Please replace with your ownner client crt string
        //   clientKey: "YourClientKeyString", // Please replace with your ownner client key string
        // }
        const attestParams2 = {
            ...attestParams,
            ...submitResult,
            requests,
            responseResolves,
            getAllJsonResponse: "true",
            // mTLS
        };

        let attestResult = await primusNetwork.attest(attestParams2);
        const yearJsonRes = primusNetwork.getPlainResponse(submitResult.taskId, 0, yearXPath)
        const dataJsonRes = primusNetwork.getPlainResponse(submitResult.taskId, 0, dataXPath)
        console.log('yearJsonRes ===', yearJsonRes)
        console.log('dataJsonRes ===', dataJsonRes)
        const dataHash = await sha256(dataJsonRes as string);
        const yearHash = await sha256(yearJsonRes as string);
        console.log('yearHash ===', yearHash)
        console.log('dataHash ===', dataHash)
        
        expect(Array.isArray(attestResult)).toBe(true);
        console.log('Attest result:', attestResult);

        const taskResult = await primusNetwork.verifyAndPollTaskResult({
          taskId: attestResult[0].taskId,
          reportTxHash: attestResult[0].reportTxHash
        });
        expect(Array.isArray(taskResult)).toBe(true);
        console.log('Task result:', taskResult);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Unexpected test error:', error);
        throw error;
      }
    }, 180000); // 30 second timeout for network operations
  });

});