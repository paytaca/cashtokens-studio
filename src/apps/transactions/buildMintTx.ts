import {
  TestNetWallet,
  TokenI,
  TokenMintRequest,
  TokenSendRequest,
  UtxoI,
  Wallet,
} from 'mainnet-js';
import { calcMinerFee } from '../utils';
import { DEFAULT_TOKEN_VALUE } from '../constants';
import { toCashScript } from '@mainnet-cash/contract';
import { Artifact, Recipient, SignatureTemplate } from 'cashscript';
import { getInstance as getContractInstance } from '../contracts';
import {
  cashAddressToLockingBytecode,
  CashAddressType,
  decodeCashAddress,
  decodeTransaction,
  hexToBin,
} from '@bitauth/libauth';
import { scriptToBytecode } from '@cashscript/utils';

export type MintTransaction = {
  sourceOutputs: any;
  decoded: any;
  encoded?: any;
};

export type MintOptions = {
  minter: UtxoI;
  tokens: TokenI[];
  recipient: string;
  wallet: Wallet | TestNetWallet;
  authKey?: UtxoI;
  publish?: {
    uris: string[];
    contentHash: string;
  };
};
export const minerFee = (numberOfTokens: number) => {
  return calcMinerFee(
    { 'P2SH-P2WPKH': 1, P2PKH: 2 },
    { P2SH: 1, P2PKH: 3 + numberOfTokens }
  );
};
export const mintCost = (numberOfTokens: number) => {
  return minerFee(numberOfTokens) + DEFAULT_TOKEN_VALUE * 2 + 400;
};

export const buildMintFromAuthGuardTx = async (
  o: MintOptions
): Promise<MintTransaction> => {
  const decodedCashAddress = decodeCashAddress(o.wallet.getDepositAddress());
  if (
      typeof decodedCashAddress !== 'string' &&
      decodedCashAddress.type === CashAddressType.p2sh
    ) {
      throw new Error('This operation is not yet supported using multisig wallet.');
  }
  if (!o.authKey || o.authKey.token?.commitment != '00') {
    throw new Error(
      'AuthKey utxo required. Make sure it conforms to the AuthGuard standard.'
    );
  }
  const funds = (await o.wallet.getAddressUtxos()).filter((u: UtxoI) => {
    return Boolean(!u.token) && u.satoshis > mintCost(o.tokens.length);
  })[0];

  if (!funds) {
    throw new Error('Insufficient balance to fund the transaction');
  }

  const [minter, authKey, funderInput] = [o.minter!, o.authKey!, funds].map(
    toCashScript
  );
  const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
  const authGuard = getContractInstance('authguard-contract', {
    authKeyTokenId: o.authKey.token.tokenId as string,
    network: o.wallet.network,
  });
  const outputs: any[] = o.tokens.map((token: TokenI) => {
    return {
      to: o.recipient, // token address
      amount: BigInt(DEFAULT_TOKEN_VALUE),
      token: {
        amount: token.amount,
        category: token.tokenId,
        nft: {
          commitment: token.commitment,
          capability: token.capability,
        },
      },
    };
  });

  let transaction = authGuard!
    .getContractFunction('unlockWithNft')(true)
    .from(minter) // contract
    .fromP2PKH([authKey], sig) // AuthNFT/minting baton
    .fromP2PKH([funderInput], sig) //  Funder
    .to([
      {
        // return authchain identity output to contract
        to: authGuard!.getTokenDepositAddress(),
        amount: minter.satoshis,
        token: minter.token,
      },
    ])
    .to([
      {
        // Return minting AuthNFT to wallet
        to: o.wallet.getTokenDepositAddress(),
        amount: BigInt(o.authKey!.satoshis),
        token: authKey.token,
      },
    ])
    .to(outputs);

  if (o.publish) {
    let contentHash = o.publish.contentHash;
    if (contentHash && !contentHash.startsWith('0x')) {
      contentHash = `0x${contentHash}`;
    }
    const opReturnData = [
      'BCMR',
      contentHash,
      ...o.publish.uris.map((u) => u.replace(/https:\/\/|ipfs:\/\//, '')),
    ];
    console.log('OP_RETURN VALUE', opReturnData);
    transaction = transaction.withOpReturn(opReturnData);
  }

  transaction = transaction

    .to(
      funderInput.satoshis - BigInt(mintCost(o.tokens.length)) > 546
        ? [
            {
              // change
              to: o.wallet.getDepositAddress(),
              amount: funderInput.satoshis - BigInt(mintCost(o.tokens.length)),
            },
          ]
        : []
    )
    .withoutChange()
    .withoutTokenChange()
    .withHardcodedFee(BigInt(minerFee(o.tokens.length)));

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
  const sourceOutputs = [
    {
      ...decoded.inputs[0],
      lockingBytecode: (
        cashAddressToLockingBytecode(authGuard!.getTokenDepositAddress()) as any
      ).bytecode,
      valueSatoshis: BigInt(minter.satoshis),
      token: minter.token && {
        ...minter.token,
        category: hexToBin(minter.token!.category),
        nft: minter.token.nft && {
          ...minter.token.nft,
          commitment: hexToBin(minter.token.nft.commitment),
        },
      },
      contract: {
        abiFunction: (transaction as any).abiFunction,
        redeemScript: scriptToBytecode(bytecode),
        artifact: artifact,
      },
    },
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
      valueSatoshis: BigInt(funderInput.satoshis),
    },
  ];

  return { decoded, sourceOutputs };
};

export const buildMintTx = async (o: MintOptions): Promise<MintTransaction> => {
  if (o.authKey) return buildMintFromAuthGuardTx(o);

  const funds = (await o.wallet.getAddressUtxos()).filter((u: UtxoI) => {
    return Boolean(!u.token) && u.satoshis > mintCost(o.tokens.length);
  })[0];

  if (!funds) {
    throw new Error('Insufficient balance to fund the transaction');
  }
  const requests = [
    new TokenSendRequest({
      cashaddr: o.wallet.getTokenDepositAddress(),
      value: DEFAULT_TOKEN_VALUE,
      tokenId: o.minter.token!.tokenId,
      amount: o.minter.token?.amount,
      capability: o.minter.token!.capability,
      commitment: o.minter.token?.commitment || '',
    }),
  ];
  requests.push(
    ...o.tokens.map((token) => {
      return new TokenSendRequest({
        cashaddr: o.recipient || o.wallet.getTokenDepositAddress(),
        value: DEFAULT_TOKEN_VALUE,
        tokenId: token.tokenId,
        amount: token.amount,
        capability: token.capability,
        commitment: token.commitment,
      });
    })
  );

  const toSpend = [o.minter, funds];

  const { encodedTransaction, sourceOutputs } =
    await o.wallet.encodeTransaction(requests, false, {
      tokenOperation: 'mint',
      checkTokenQuantities: false,
      buildUnsigned: true,
      utxoIds: toSpend,
      ensureUtxos: toSpend,
    });

  return {
    encoded: encodedTransaction,
    decoded: decodeTransaction(encodedTransaction),
    sourceOutputs,
  };
};
