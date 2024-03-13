import { TestNetWallet, UtxoI, Wallet } from 'mainnet-js';
import { calcMinerFee } from '../utils';
import { toCashScript } from '@mainnet-cash/contract';
import { Artifact, Recipient, SignatureTemplate } from 'cashscript';
import { getInstance as getContractInstance } from '../contracts';
import {
  cashAddressToLockingBytecode,
  decodeTransaction,
  hexToBin,
} from '@bitauth/libauth';
import { scriptToBytecode } from '@cashscript/utils';

export type PublicationTransaction = {
  sourceOutputs: any;
  decoded: any;
  encoded?: any;
};

export type PublicationOptions = {
  authHead: UtxoI;
  wallet: Wallet | TestNetWallet;
  authKey: UtxoI;
  uris: string[];
  contentHash: string;
};

export const publicationCost = calcMinerFee(
  { 'P2SH-P2WPKH': 1 },
  { P2SH: 1, P2PKH: 2 }
);

export const buildBcmrPublicationTx = async (
  o: PublicationOptions
): Promise<PublicationTransaction> => {
  if (!o.authHead) {
    throw new Error('Missing authHead utxo');
  }

  if (o.uris.length < 1 || !o.contentHash) {
    throw new Error('URIs and BCMR content hash required');
  }

  const funds = (await o.wallet!.getAddressUtxos())
    .filter(
      (utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > publicationCost
    )
    .map(toCashScript)[0];
  if (!funds) {
    throw new Error('Insufficient balance to fund the txn');
  }

  const [authHead, authKey] = [o.authHead, o.authKey!].map(toCashScript);
  const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
  const authGuard = getContractInstance('authguard-contract', {
    authKeyTokenId: o.authKey.token!.tokenId as string,
    network: o.wallet.network,
  });

  let contentHash = o.contentHash;

  if (contentHash && !contentHash.startsWith('0x')) {
    contentHash = `0x${contentHash}`;
  }

  const opReturnData = [
    'BCMR',
    contentHash,
    ...o.uris.map((u) => u.replace(/https:\/\/|ipfs:\/\//, '')),
  ];

  const authHeadRecipient: Recipient = {
    to: authGuard!.getTokenDepositAddress(),
    amount: authHead.satoshis,
  };

  // To accomodate non-token authHeads
  if (authHead.token && authHead.token.category) {
    authHeadRecipient.token = authHead.token;
  } else {
    if (authHead.token?.amount && authHead.token?.amount > 0) {
      // Just making sure we don't accidentally delete token amount
      throw Error(
        'Anomaly, authHead is non-token but has token amount!Utxo = ' +
          JSON.stringify(authHead.token || {})
      );
    }
    delete authHead.token; // toCashscript has token attribute even if utxo has no tokenId
  }

  const transaction = authGuard!
    .getContractFunction('unlockWithNft')(true)
    .from(authHead)
    .fromP2PKH(authKey, sig)
    .fromP2PKH(funds, sig)
    .to([authHeadRecipient])
    .to([
      {
        // Return AuthKey to owner
        to: o.wallet.getTokenDepositAddress(),
        amount: BigInt(authKey.satoshis),
        token: authKey.token,
      },
    ])
    .withOpReturn(opReturnData!)
    .to(
      funds.satoshis - BigInt(publicationCost) > 546
        ? [
            {
              // change
              to: o.wallet.getDepositAddress(),
              amount: funds.satoshis - BigInt(publicationCost),
            },
          ]
        : []
    )
    .withoutChange()
    .withoutTokenChange()
    .withHardcodedFee(BigInt(publicationCost));

  const decoded = decodeTransaction(hexToBin(await transaction.build()));

  if (typeof decoded === 'string') {
    throw new Error('Failed to decode transaction');
  }

  const bytecode = (transaction as any).redeemScript;
  const artifact = { ...authGuard!.artifact } as Partial<Artifact>;
  delete artifact.source;
  delete artifact.bytecode;

  decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
  decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);

  const authHeadSourceOutput: any = {
    ...decoded.inputs[0],
    lockingBytecode: (
      cashAddressToLockingBytecode(authGuard!.getTokenDepositAddress()) as any
    ).bytecode,
    valueSatoshis: BigInt(authHead.satoshis),
    contract: {
      abiFunction: (transaction as any).abiFunction,
      redeemScript: scriptToBytecode(bytecode),
      artifact: artifact,
    },
  };

  if (authHead.token?.category) {
    authHeadSourceOutput.token = authHead.token && {
      ...authHead.token,
      category: hexToBin(authHead.token!.category),
      nft: authHead.token.nft && {
        ...authHead.token.nft,
        commitment: hexToBin(authHead.token.nft.commitment),
      },
    };
  }

  const sourceOutputs = [
    // {
    //   ...decoded.inputs[0],
    //   lockingBytecode: (
    //     cashAddressToLockingBytecode(authGuard!.getTokenDepositAddress()) as any
    //   ).bytecode,
    //   valueSatoshis: BigInt(authHead.satoshis),
    //   token: authHead.token && {
    //     ...authHead.token,
    //     category: hexToBin(authHead.token!.category),
    //     nft: authHead.token.nft && {
    //       ...authHead.token.nft,
    //       commitment: hexToBin(authHead.token.nft.commitment),
    //     },
    //   },
    //   contract: {
    //     abiFunction: (transaction as any).abiFunction,
    //     redeemScript: scriptToBytecode(bytecode),
    //     artifact: artifact,
    //   },
    // },
    authHeadSourceOutput,
    {
      ...decoded.inputs[1],
      lockingBytecode: (
        cashAddressToLockingBytecode(o.wallet.getTokenDepositAddress()) as any
      ).bytecode,
      valueSatoshis: BigInt(authKey.satoshis),
      token: authKey.token && {
        ...authKey.token,
        category: hexToBin(authKey.token!.category),
        nft: authKey.token.nft && {
          ...authKey.token.nft,
          commitment: hexToBin(authKey.token.nft.commitment),
        },
      },
    },
    {
      ...decoded.inputs[2],
      lockingBytecode: (
        cashAddressToLockingBytecode(o.wallet.getDepositAddress()) as any
      ).bytecode,
      valueSatoshis: BigInt(funds.satoshis),
    },
  ];

  return { decoded, sourceOutputs };
};
