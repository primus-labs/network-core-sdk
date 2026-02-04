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
        const initResult = await primusNetwork.init(wallet, chainId);
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

        const requests = [
            {
            url: "https://postman-echo.com/post",
            method: "POST",
            header: {
              "Content-Type": "application/json"
            },
            body: {
              foo: "bar"
            },
            }
        ];
        const responseResolves = [
            [
            {
                keyName: "data",
                parseType: "json",
                parsePath: "$.data",
                op: "SHA256_EX"
            },
            {
                keyName: "reqbodykeyname",
                parseType: "json",
                parsePath: "^.foo",
                op: "SHA256_WITH_SALT"
            }
            ]
        ];

        const attestParams2 = {
            ...attestParams,
            ...submitResult,
            requests,
            responseResolves,
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


        // Parse attested request-body hash (reqbodykeyname) from attestation.data
        const attDataObject = JSON.parse(attestResult[0].attestation.data);
        const attReqBodyHash = attDataObject["reqbodykeyname"];

        // Encode request body content "bar" as bytes
        const reqContentBytes = new TextEncoder().encode("bar");
        // Get salt for reqbodykeyname from private data (hex string)
        const reqSalt = primusNetwork.getPrivateData(attestResult[0].taskId, "reqbodykeyname");
        if (typeof reqSalt !== "string") {
          throw new Error("Expected reqSalt to be string, got " + typeof reqSalt);
        }
        // Concatenate request-body bytes + salt bytes, then SHA256 to get local req body hash
        const reqBytes = new Uint8Array([ ...reqContentBytes, ...hexDecodeToBytes(reqSalt)]);
        const reqHash = await sha256Bytes(reqBytes);
        console.log('compute reqHash ===', reqHash);

        // Assert local hash matches attested hash on attestation
        expect(reqHash).toBe(attReqBodyHash);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Unexpected test error:', error);
        throw error;
      }
    }, 180000); // 30 second timeout for network operations
  });

});

const hexDecodeToBytes = (hex: string): Uint8Array => {
  const match = hex.replace(/^0x/i, '').match(/.{1,2}/g);
  if (!match || hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
};

const sha256Bytes = async (bytes: Uint8Array): Promise<string> => {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const hashBuffer = await (globalThis.crypto?.subtle
    ? globalThis.crypto.subtle.digest('SHA-256', buffer)
    : require('crypto').webcrypto.subtle.digest('SHA-256', buffer));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};