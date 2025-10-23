export const ONESECOND = 1000;
export const ONEMINUTE = 60 * ONESECOND;
export const ATTESTATIONPOLLINGTIME = 1 * ONESECOND;
export const ATTESTATIONPOLLINGTIMEOUT = 2 * ONEMINUTE;
export const ATTESTATIONPOLLINGTIMEOUTMOBILE = 5 * ONEMINUTE;

export const SUPPORTEDCHAINIDSMAP = {
  84532: {
    chainId: 84532,
    chainName: 'Base Sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Sepolia Ether',
      symbol: 'ETH',
    },
    taskContractAddress: "0xC02234058caEaA9416506eABf6Ef3122fCA939E8",
    nodeContractAddress: "0xF7dc28456B19b2f8ca80B363c911CaDE1FB84bC6",
  },
  8453: {
    chainId: 8453,
    chainName: 'Base',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    taskContractAddress: "0x151cb5eD5D10A42B607bB172B27BDF6F884b9707",
    nodeContractAddress: "0x9C1bb8197720d08dA6B9dab5704a406a24C97642",
  },
};


export const SUPPORTEDCHAINIDS: number[] = Object.keys(SUPPORTEDCHAINIDSMAP).map(i => Number(i))
