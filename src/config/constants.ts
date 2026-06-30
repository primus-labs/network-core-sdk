export const ONESECOND = 1000;
export const ONEMINUTE = 60 * ONESECOND;
export const ATTESTATIONPOLLINGTIME = 1 * ONESECOND;
export const ATTESTATIONPOLLINGTIMEOUT = 2 * ONEMINUTE;
export const ATTESTATIONPOLLINGTIMEOUTMOBILE = 5 * ONEMINUTE;

/**
 * Canonical PRIM ERC20 contract address per chain ID (used for approve before submitTask).
 * Omit a chain until the deployment address is known.
 */
export const DEFAULT_PRIM_TOKEN_ADDRESS_BY_CHAIN_ID: Readonly<Partial<Record<number, string>>> = {
  84532: '0x06d0138A88D4D6111C51f7BfCaDe60c4bb622c97'
};

/**
 * Canonical PRIM ERC20 contract address for `chainId` (used for approve before submitTask).
 */
export function resolvePrimTokenAddress(chainId: number): string | undefined {
  const fromMap = DEFAULT_PRIM_TOKEN_ADDRESS_BY_CHAIN_ID[chainId];
  const fromTrim = fromMap?.trim();
  return fromTrim || undefined;
}

export const SUPPORTEDCHAINIDSMAP = {
  84532: {
    isTestnet: true,
    chainId: 84532,
    chainName: 'Base Sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Sepolia Ether',
      symbol: 'ETH',
    },
    taskContractAddress: '0xC02234058caEaA9416506eABf6Ef3122fCA939E8',
    nodeContractAddress: '0xF7dc28456B19b2f8ca80B363c911CaDE1FB84bC6',
  },
  8453: {
    chainId: 8453,
    chainName: 'Base',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    taskContractAddress: '0x151cb5eD5D10A42B607bB172B27BDF6F884b9707',
    nodeContractAddress: '0x9C1bb8197720d08dA6B9dab5704a406a24C97642',
  },
  133: {
    isTestnet: true,
    chainId: 133,
    chainName: 'HashKey Chain testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'HSK',
      symbol: 'HSK',
    },
    taskContractAddress: '0x6588a24D34C881cF10c8DA77e282f6E1fBc262C7',
    nodeContractAddress: '0x106a8A53C6B7d8cc11c10152DD297130be6774f6',
  },
  177: {
    chainId: 177,
    chainName: 'HashKey Chain',
    nativeCurrency: {
      decimals: 18,
      name: 'HSK',
      symbol: 'HSK',
    },
    taskContractAddress: '0x1c5D0d5e0a3e0a5c9B0cDcF5C25A892281e4cd04',
    nodeContractAddress: '0x3CF341692deAD89AD0e98141B768eF3Ad89CDCa7',
  },
  97: {
    chainId: 97,
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'BNB',
      symbol: 'tBNB',
    },
    taskContractAddress: '0x05e55E36C33324C81e163125d36Ac26f585ACa8e',
    nodeContractAddress: '0xE8AeA2A1d891bA268c16b657B9A53EF187425c21',
  },
  56: {
    chainId: 56,
    chainName: 'BNB Smart Chain',
    nativeCurrency: {
      decimals: 18,
      name: 'BNB',
      symbol: 'BNB',
    },
    taskContractAddress: '0x7be04E0a97BD34aBBf510D963d55B6B89C37673d',
    nodeContractAddress: '0xC3B952a0Cca681DB01334E01669b7823beBC6839',
  }
};


export const SUPPORTEDCHAINIDS: number[] = Object.keys(SUPPORTEDCHAINIDSMAP).map(i => Number(i));
