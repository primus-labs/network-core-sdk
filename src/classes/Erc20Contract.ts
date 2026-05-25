import { BigNumber, ethers } from 'ethers';
import abi from '../config/erc20Abi.json';

export type Erc20ApproveRawParams = {
  spenderAddress: string;
  /** Amount in token smallest units (same base units as on-chain fee query). */
  amount: BigNumber;
  otherParams?: Record<string, unknown>;
};

class Erc20Contract {
  private readonly provider: unknown;
  contractInstance: ethers.Contract;

  constructor(provider: unknown, address: string) {
    if (!provider || !address) {
      throw new Error('provider, address are required');
    }
    this.provider = provider;
    this.contractInstance = new ethers.Contract(address, abi, provider as ethers.Signer | ethers.providers.Provider);
  }

  allowance(owner: string, spender: string): Promise<BigNumber> {
    return this.contractInstance.allowance(owner, spender);
  }

  private getSignerAddress(): Promise<string> {
    const p = this.provider as { getAddress?: () => Promise<string> };
    if (typeof p.getAddress === 'function') {
      return p.getAddress();
    }
    return Promise.reject(new Error('ERC20 approve requires a signer (provider with getAddress)'));
  }

  /**
   * Approve spender for an exact raw token amount when current allowance is insufficient.
   */
  async approveRawAmount(params: Erc20ApproveRawParams): Promise<void> {
    const { spenderAddress, amount, otherParams } = params;
    const owner = await this.getSignerAddress();
    const allowanceBn = await this.allowance(owner, spenderAddress);
    if (!allowanceBn.lt(amount)) {
      return;
    }
    const tx = otherParams
      ? await this.contractInstance.approve(spenderAddress, amount, otherParams)
      : await this.contractInstance.approve(spenderAddress, amount);
    await tx.wait();
  }
}

export default Erc20Contract;
