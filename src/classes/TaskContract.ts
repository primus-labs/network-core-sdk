import { ContractReceipt, BigNumber } from "ethers";
import Contract from './Contract';
import abi from '../config/taskAbi.json';
import { parseTxEvent as parseTxEventFn } from '../utils';
import { TaskInfo, FeeInfo, TokenSymbol } from '../types/index'

class TaskContract {
  contractInstance: any;
  constructor(provider: any, address: string) {
    if (!provider || !address) {
      throw new Error('provider, address are required');
    }
    this.contractInstance = new Contract(address, abi, provider);
  }

  async submitTask(address: string, templateId: string, attestorCount?: number, tokenSymbol = TokenSymbol.ETH, callbackAddress = "0x0000000000000000000000000000000000000000"): Promise<ContractReceipt> {
    return new Promise(async (resolve, reject) => {
      try {
        const feeRes = await this.queryLatestFeeInfo(tokenSymbol);
        const { attestorFee, primusFee } = feeRes;
        const totalFee = attestorFee.add(primusFee).mul(BigNumber.from(attestorCount))
        const params = [address, templateId, attestorCount, tokenSymbol, callbackAddress, { value: totalFee }];
        const result = await this.contractInstance.sendTransaction('submitTask', params)
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
  async queryLatestFeeInfo(tokenSymbol: TokenSymbol): Promise<FeeInfo> {
    return new Promise(async (resolve, reject) => {
      try {
        const params = [tokenSymbol];
        const result = await this.contractInstance.callMethod('queryLatestFeeInfo', params)
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }


  async queryTask(taskId: string, blockNumber: number): Promise<TaskInfo> {
    return new Promise(async (resolve, reject) => {
      try {
        const params = [taskId];
        const result = await this.contractInstance.callMethod('queryTask', params, blockNumber)
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
  static parseTxEvent(receipt: any, eventName: string) {
    return parseTxEventFn(abi, receipt, eventName)
  }
  async withdrawBalance(tokenSymbol: TokenSymbol, limit: number) {
    return new Promise(async (resolve, reject) => {
      try {
        const params = [tokenSymbol, limit];
        const result = await this.contractInstance.sendTransaction('withdrawBalance', params)
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
  async queryUnsettledTasks(address: string, tokenSymbol: TokenSymbol, offset: number, limit: number) {
    return new Promise(async (resolve, reject) => {
      try {
        const params = [address, tokenSymbol, offset, limit];
        const result = await this.contractInstance.callMethod('queryUnsettledTasks', params)
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
  async queryTaskTimeout(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.contractInstance.callMethod('taskTimeout', [])
        resolve(result.toNumber());
      } catch (error) {
        return reject(error);
      }
    });
  }
}

export { TaskContract };