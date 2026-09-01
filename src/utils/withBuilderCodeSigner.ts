import { ethers } from 'ethers';

import { isBaseBuilderCodeChainId } from '../config/constants';
import { appendBuilderCodeToTxData } from './builderCodeAttribution';

type TransactionRequest = ethers.providers.TransactionRequest;

class BuilderCodeSigner extends ethers.Signer {
  constructor(
    private readonly inner: ethers.Signer,
    private readonly chainId: number,
    private readonly builderCodes: readonly string[]
  ) {
    super();
    ethers.utils.defineReadOnly(this, 'provider', inner.provider);
  }

  private async patchTransactionData(
    transaction: TransactionRequest
  ): Promise<TransactionRequest> {
    const resolved = (await ethers.utils.resolveProperties(
      transaction
    )) as TransactionRequest;

    if (!isBaseBuilderCodeChainId(this.chainId) || this.builderCodes.length === 0) {
      return resolved;
    }

    const dataHex =
      resolved.data == null
        ? undefined
        : typeof resolved.data === 'string'
          ? resolved.data
          : ethers.utils.hexlify(resolved.data as ethers.BytesLike);

    return {
      ...resolved,
      data: appendBuilderCodeToTxData(dataHex, [...this.builderCodes]),
    };
  }

  getAddress(): Promise<string> {
    return this.inner.getAddress();
  }

  signMessage(message: ethers.Bytes | string): Promise<string> {
    return this.inner.signMessage(message);
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    const patched = await this.patchTransactionData(transaction);
    return this.inner.signTransaction(patched);
  }

  async sendTransaction(transaction: TransactionRequest): Promise<ethers.providers.TransactionResponse> {
    const patched = await this.patchTransactionData(transaction);
    return this.inner.sendTransaction(patched);
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    return withBuilderCodeSigner(this.inner.connect(provider), this.chainId, this.builderCodes);
  }
}

/**
 * Wrap an ethers Signer so `sendTransaction` / `signTransaction` append Base Builder Code.
 * Used for Node.js Wallet + JsonRpcProvider flows.
 */
export function withBuilderCodeSigner(
  signer: ethers.Signer,
  chainId: number,
  builderCodes: readonly string[]
): ethers.Signer {
  if (!isBaseBuilderCodeChainId(chainId) || builderCodes.length === 0) {
    return signer;
  }

  if (signer instanceof BuilderCodeSigner) {
    return signer;
  }

  return new BuilderCodeSigner(signer, chainId, builderCodes);
}
