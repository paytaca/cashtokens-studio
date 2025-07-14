import { TestNetWallet, UtxoI, Wallet } from 'mainnet-js';

import { toCashScript } from '@mainnet-cash/contract';
import { Artifact, SignatureTemplate } from 'cashscript';
import { getInstance as getContractInstance } from '../contracts';
import {
  cashAddressToLockingBytecode,
  CashAddressType,
  decodeCashAddress,
  decodeTransaction,
  hexToBin,
} from '@bitauth/libauth';
import { scriptToBytecode } from '@cashscript/utils';
import type { TokenDetails } from 'cashscript/dist/interfaces';
import { calcMinerFee } from '../utils';
import { DEFAULT_TOKEN_VALUE } from '../constants';

export type IssueFtReserveOptions = {
  authUtxo: UtxoI;
  authKey: UtxoI;
  /**
   * Amount to Issue
   */
  amount: string | bigint | number;
  /**
   * If semi-fungible NFTs
   */
  nft?: {
    capability: 'none' | 'mutable' | 'minting';
    commitment: string;
  };
  recipient: string;

  wallet: Wallet | TestNetWallet;
};

export type IssueFtReserveResult = {
  decoded: any;
  sourceOutputs: any;
};

const minerFee = calcMinerFee(
  { 'P2SH-P2WPKH': 1, P2PKH: 3 },
  { P2SH: 1, P2PKH: 2 }
);
export const issuanceCost = minerFee + DEFAULT_TOKEN_VALUE + 400;

export const buildIssueFtReserveTx = async (opt: IssueFtReserveOptions) => {
  const decodedCashAddress = decodeCashAddress(opt.wallet.getDepositAddress());
  if (
      typeof decodedCashAddress !== 'string' &&
      decodedCashAddress.type === CashAddressType.p2sh
    ) {
      throw new Error('This operation is not yet supported using multisig wallet.');
  }

  console.log('OPT', opt);
  if (
    !opt.authUtxo?.token ||
    !opt.authKey ||
    opt.authKey.token?.commitment != '00'
  ) {
    throw new Error('AuthUtxo and AuthKey required.');
  }

  const funds = (await opt.wallet.getAddressUtxos()).filter((u: UtxoI) => {
    return Boolean(!u.token) && u.satoshis > issuanceCost;
  })[0];

  if (!funds) {
    throw new Error('Insufficient balance to fund the transaction');
  }

  const newFtBalance =
    BigInt(opt.authUtxo.token.amount || 0) - BigInt(opt.amount);
  if (newFtBalance < 0) {
    throw new Error('FT Amount too high.');
  }

  const [authUtxo, authKey, funderInput] = [
    opt.authUtxo!,
    opt.authKey!,
    funds,
  ].map(toCashScript);

  const sig = new SignatureTemplate(Uint8Array.from(Array(32)));

  const authGuard = getContractInstance('authguard-contract', {
    authKeyTokenId: opt.authKey.token.tokenId as string,
    network: opt.wallet.network,
  });

  const issuedToken: TokenDetails = {
    category: authUtxo.token!.category,
    amount: BigInt(opt.amount),
  };

  if (opt.nft) {
    issuedToken.nft = opt.nft;
  }

  let transaction = authGuard!
    .getContractFunction('unlockWithNft')(true)
    .from(authUtxo)
    .fromP2PKH([authKey], sig)
    .fromP2PKH([funderInput], sig)
    .to([
      {
        to: authGuard!.getTokenDepositAddress(),
        amount: BigInt(opt.authUtxo!.satoshis),
        token: {
          category: authUtxo.token!.category,
          amount: newFtBalance,
          nft: authUtxo.token!.nft,
        },
      },
    ])
    .to([
      {
        to: opt.wallet.getTokenDepositAddress(),
        amount: BigInt(opt.authKey!.satoshis),
        token: authKey.token,
      },
    ])
    .to([
      {
        to: opt.recipient,
        amount: BigInt(DEFAULT_TOKEN_VALUE),
        token: issuedToken,
      },
    ]);

  transaction = transaction
    .to(
      funderInput.satoshis - BigInt(issuanceCost) > 657
        ? [
            {
              // change
              to: opt.wallet.getDepositAddress(),
              amount: funderInput.satoshis - BigInt(issuanceCost),
            },
          ]
        : []
    )
    .withoutChange()
    .withoutTokenChange()
    .withHardcodedFee(BigInt(minerFee));

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
      valueSatoshis: BigInt(authUtxo.satoshis),
      token: authUtxo.token && {
        ...authUtxo.token,
        category: hexToBin(authUtxo.token!.category),
        nft: authUtxo.token.nft && {
          ...authUtxo.token.nft,
          commitment: hexToBin(authUtxo.token.nft.commitment),
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
        cashAddressToLockingBytecode(opt.wallet.getTokenDepositAddress()) as any
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
        cashAddressToLockingBytecode(opt.wallet.getDepositAddress()) as any
      ).bytecode,
      valueSatoshis: BigInt(funderInput.satoshis),
    },
  ];

  return { decoded, sourceOutputs };
};
