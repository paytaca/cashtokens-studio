import {
  IdentitySnapshot,
  NFTCapability,
  UtxoI,
  TokenCategory,
  URIs,
} from 'mainnet-js';

export type NftCollectionType =
  | 'SequentialNftCollection'
  | 'ParsableNftCollection'; //

export type GenesisOptions = {
  useAuthGuard?: boolean; // use authguard, default = true
  includeAuthKeyGenesis?: boolean; // also create AuthKey genesis, useAuthGuard will be ignored and assumes to be true
  issuedSupply?: { amount: string; recipient: string }; // the token amount to issue
  amount?: bigint;
  capability?: NFTCapability;
  commitment?: string; // could be a number text e.g. '10' or hex '0a' Big Endian
  commitmentFormat?: 'decimal' | 'hex'; // what's the format of the commitment's value
  nftCollectionType?: NftCollectionType;
  walletType?: 'paytaca' | 'walletconnect';
  walletConnectSession?: any;
};

export type TokenBalance = {
  tokenId: string;
  utxos: UtxoI[];
  balance: bigint;
};

/**
 * Aggregated fungible token balance
 */
export type FungibleTokenBalance = {
  tokenId: string;
  utxos?: UtxoI[];
  utxoCount: number;
  balance: bigint;
  owner: string;
  tokenUris?: URIs;
  tokenCategory?: TokenCategory;
  identitySnapshot?: IdentitySnapshot;
};

export type NonFungibleTokenBalance = {
  capability: NFTCapability;
  commitment?: string;
} & FungibleTokenBalance;

export declare interface BcmrStorageArtifact {
  uris: {
    https: string;
    ipfs: string;
  };
  contentHash: string;
}

export declare interface IconStorageArtifact {
  uris: {
    https: string;
    ipfs: string;
  };
  nftStorageMetadata: {
    ipnft: string;
    url: string;
  };
}

export declare interface PaginatedData {
  count: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

export type CashTokenTransactionType =
  | 'AuthKey.transfer'
  | 'AuthKey.createGenesis'
  | 'AuthchainIdentity.unguard'
  | 'AuthchainIdentity.publishRegistry'
  | 'AuthchainIdentity.releaseTokensFromReserveSupply'
  | 'Cashtoken.mintChild'
  | 'Cashtoken.createGenesis'
  | 'GenesisInput.generate';

export type BroadcastStatus = 'pending' | 'broadcasted' | 'cancelled' | 'failed' | 'done';
  /**
 * @property signingProgress      Progress of a transaction signing
 * @property broadcastStatus 
 * @property txid                 Broadcast txid
 * @property wallet               The multisig wallet id
 * @property transactionProposal  The transaction proposal id
 */
export interface TransactionProposalStatus {
  signingProgress?: 'fully-signed' | 'partially-signed' | 'unsigned';
  broadcastStatus?: BroadcastStatus;
  transactionProposal?: number;
  wallet?: number
  txid?: string;
}

/**
 * Used for logging transactions in the CTS
 */
export declare interface CashTokenTransaction extends TransactionProposalStatus {
  txid: string; // unsignedHash is used as temporary txid for multisig transactions
  unsignedHash?: string; 
  txType: CashTokenTransactionType;
  timestamp: number;
  successMsg?: string;
  errorMsg?: string;
  statusUrl?: string
}

export type HexString = string & { __hexStringBrand: never };

export type NftProjectDrop = {
  tokenId: string;
  collectionSize: number;
  mintingBannerMessage: string;
  mintingContractName: string;
  mintingDate: string;
  mintingPrice: number;
  publishedOn: number;
  publisherAddress: string;
};

export type SignTransaction = (
  decodedTransaction: any,
  sourceOutputs: any,
  broadcast?: boolean,
  prompt?: string
) => Promise<any>;
export type SignMessage = (
  message: any,
  broadcast?: boolean,
  prompt?: string
) => Promise<any>;

export interface TransactionSigner {
  type: 'paytaca' | 'walletconnect';
  // address?: string,
  signTransaction: SignTransaction;
  signMessage: SignMessage;
}

export enum TokenType {
  ft = 'ft',
  nft = 'nft',
  hybrid = 'hybrid',
}

