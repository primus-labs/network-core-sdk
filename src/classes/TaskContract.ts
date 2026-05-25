import { ContractReceipt, BigNumber, ethers } from "ethers";
import Contract from './Contract';
import Erc20Contract from './Erc20Contract';
import abi from '../config/taskAbi.json';
import { parseTxEvent as parseTxEventFn } from '../utils';
import { TaskInfo, FeeInfo, TokenSymbol, SubmitTaskContractParams } from '../types/index'

function isZeroOrInvalidAddress(addr: string): boolean {
  try {
    return ethers.utils.getAddress(addr) === ethers.constants.AddressZero;
  } catch {
    return true;
  }
}

class TaskContract {
  contractInstance: any;
  constructor(provider: any, address: string) {
    if (!provider || !address) {
      throw new Error('provider, address are required');
    }
    this.contractInstance = new Contract(address, abi, provider);
  }

  async submitTask(submitParams: SubmitTaskContractParams): Promise<ContractReceipt> {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          address,
          templateId,
          attestorCount = 1,
          tokenSymbol = TokenSymbol.ETH,
          tokenAddress,
          callbackAddress = "0x0000000000000000000000000000000000000000"
        } = submitParams;
        const feeRes = await this.queryLatestFeeInfo(tokenSymbol);
        const { attestorFee, primusFee } = feeRes;
        const totalFee = attestorFee.add(primusFee).mul(BigNumber.from(attestorCount))
        const payWithErc20 = tokenSymbol !== TokenSymbol.ETH;
        if (payWithErc20) {
          if (!tokenAddress || isZeroOrInvalidAddress(tokenAddress)) {
            throw new Error('When tokenSymbol is not ETH, tokenAddress must be the ERC20 token contract address (non-zero).');
          }
          const tokenContract = new Erc20Contract(this.contractInstance.provider, tokenAddress);
          await tokenContract.approveRawAmount({
            spenderAddress: this.contractInstance.address,
            amount: totalFee
          });
        }
        // Get current gas price
        const gasPrice = await this.contractInstance.provider.getGasPrice();
        const txOverrides = payWithErc20 ? { value: BigNumber.from(0), gasPrice: gasPrice } : { value: totalFee, gasPrice: gasPrice };
        const params = [address, templateId, attestorCount, tokenSymbol, callbackAddress, txOverrides];
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