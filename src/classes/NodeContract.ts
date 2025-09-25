import Contract from './Contract';
import abi from '../config/nodeAbi.json';
import { NodeInfo } from '../types/index'

class NodeContract {
  contractInstance: any;
  constructor(provider: any, address: string) {
    if (!provider || !address) {
      throw new Error('provider, address are required');
    }
    this.contractInstance = new Contract(address, abi, provider);
  }

  async getNodeInfo(nodeId: string): Promise<NodeInfo> {
    return new Promise(async (resolve, reject) => {
      try {
        const params = [nodeId];
        const result = await this.contractInstance.callMethod('getNodeInfo', params)
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
}

export { NodeContract };