import { TestNetWallet, UtxoI, Wallet } from 'mainnet-js';
import { calcMinerFee } from '../utils';
import { DEFAULT_TOKEN_VALUE } from '../constants';
import { toCashScript } from '@mainnet-cash/contract';
import { Artifact, Recipient, SignatureTemplate } from 'cashscript';
import { getInstance as getContractInstance } from '../contracts';
import {
  cashAddressToLockingBytecode,
  decodeTransaction,
  hexToBin,
} from '@bitauth/libauth';
import { scriptToBytecode } from '@cashscript/utils';

export type BurnFtReserveOptions = {
  authUtxo: UtxoI;
  authKey: UtxoI;
  /**
   * Amount to burn
   */
  amount: string | bigint | number;
  wallet: Wallet | TestNetWallet;
};

export type BurnFtReserveResult = {
  decoded: any;
  sourceOutputs: any;
};

const minerFee = calcMinerFee(
  { 'P2SH-P2WPKH': 1, P2PKH: 2 },
  { P2SH: 1, P2PKH: 2 }
);
export const burnCost = minerFee + DEFAULT_TOKEN_VALUE + 400;

export const buildBurnFtReserveTx = async (opt: BurnFtReserveOptions) => {
  if (
    !opt.authUtxo?.token ||
    !opt.authKey ||
    opt.authKey.token?.commitment != '00'
  ) {
    throw new Error('AuthUtxo and AuthKey required.');
  }

  const funds = (await opt.wallet.getAddressUtxos()).filter((u: UtxoI) => {
    return Boolean(!u.token) && u.satoshis > burnCost;
  })[0];

  if (!funds) {
    throw new Error('Insufficient balance to fund the transaction');
  }

  opt.authUtxo.token.amount =
    BigInt(opt.authUtxo.token.amount || 0) - BigInt(opt.amount);
  if (opt.authUtxo.token.amount < 0) {
    throw new Error('Amount too high.');
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

  let transaction = authGuard!
    .getContractFunction('unlockWithNft')(true)
    .from(authUtxo) // contract
    .fromP2PKH([authKey], sig) // AuthNFT/minting baton
    .fromP2PKH([funderInput], sig) //  Funder
    .to([
      {
        to: authGuard!.getTokenDepositAddress(),
        amount: BigInt(opt.authKey!.satoshis),
        token: authUtxo.token,
      },
    ])
    .to([
      {
        to: opt.wallet.getTokenDepositAddress(),
        amount: BigInt(opt.authKey!.satoshis),
        token: authKey.token,
      },
    ]);

  transaction = transaction

    .to(
      funderInput.satoshis - BigInt(burnCost) > 546
        ? [
            {
              // change
              to: opt.wallet.getDepositAddress(),
              amount: funderInput.satoshis - BigInt(burnCost),
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
