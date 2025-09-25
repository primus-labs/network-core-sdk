import { ethers } from 'ethers';
import { ContractReceipt } from "ethers";
class Contract {
  address: string;
  provider: any;
  contractInstance: ethers.Contract;

  /**
   * @param chainName The name of the chain, used to identify and differentiate between different chains.
   * @param provider The provider object for the blockchain, used to establish and manage the connection with the blockchain.
   */
  constructor(address: string, abiJson: any, provider: any) {
    if (!provider || !address || !abiJson) {
        throw new Error('provider, address, and abiJson are required');
    }
    this.address = address;
    this.provider = provider;
    this.contractInstance = new ethers.Contract(this.address, abiJson, this.provider);
  }
  // Example method to read from the contract
  async callMethod(functionName: string, functionParams: any[], blockNumber: number = 0) {
    return new Promise(async (resolve, reject) => {
      if (!this.contractInstance[functionName]) {
        return reject(`Method ${functionName} does not exist on the contract`)
      }
      try {
        const bN = blockNumber ? blockNumber : await this.contractInstance.provider.getBlockNumber();
        const result = await this.contractInstance[functionName](...functionParams, { blockTag: bN });
        return resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
  // Example method to send a transaction
  async sendTransaction(functionName: string, functionParams: any[]): Promise<ContractReceipt> {
    return new Promise(async (resolve, reject) => {
      if (!this.contractInstance[functionName]) {
        return reject(`Method ${functionName} does not exist on the contract`)
      }
      try {
        console.log('sendTransaction params:', functionName, ...functionParams)
        const tx = await this.contractInstance[functionName](...functionParams);
        // console.time('txreceiptTimeInSdk');
        const txReceipt = await tx.wait();
        // console.timeEnd('txreceiptTimeInSdk');
        console.log("txreceipt", txReceipt);
        // resolve(tx.hash);
        resolve(txReceipt);
      } catch (error: any) {
        console.log("sendTransaction error:", error);
        return reject(error)
      }
    });
  }
}

export default Contract;