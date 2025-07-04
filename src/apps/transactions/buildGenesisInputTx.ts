import {
  FeePaidByEnum,
  // NFTCapability,
  // OpReturnData,
  SendRequest,
  TestNetWallet,
  // TokenI,
  // TokenSendRequest,
  UnitEnum,
  UtxoI,
  Wallet,
  // hexToBin,
} from 'mainnet-js';

import { DEFAULT_TOKEN_VALUE } from '../constants';
import { calcMinerFee } from '../utils';
// import { getInstance } from '../contracts';
// import { Utxo } from 'cashscript';
import {
  CashAddressType,
  decodeCashAddress,
  decodeTransaction,
} from '@bitauth/libauth';

export type GenesisInputOptions = {
  wallet: Wallet | TestNetWallet;
};

export type GenesisInputResult = {
  encoded: any;
  decoded: any;
  sourceOutputs: any;
};

// export const genesisInputCost =
//   calcMinerFee({ P2PKH: 1 }, { P2PKH: 1 }) + DEFAULT_TOKEN_VALUE + 400;

export const genesisInputCost = (walletAddressType?: CashAddressType) => {
  let cost = calcMinerFee({ P2PKH: 1 }, { P2PKH: 2 }) + DEFAULT_TOKEN_VALUE;
  if (walletAddressType && walletAddressType === CashAddressType.p2sh) {
    cost =
      calcMinerFee({ 'MULTISIG-P2SH:3-4': 1 }, { P2SH: 2 }) +
      DEFAULT_TOKEN_VALUE;
  }
  return cost;
};
/**
 * Creates a transaction that produces a valid genesis input. Basically just transfer funds to
 * the same wallet. :-)
 */
export const buildGenesisInputTx = async (
  opt: GenesisInputOptions
): Promise<GenesisInputResult> => {
  const requests = [
    new SendRequest({
      cashaddr: opt.wallet!.getDepositAddress(),
      value: DEFAULT_TOKEN_VALUE,
      unit: UnitEnum.SATOSHIS,
    }),
  ];

  let cost = genesisInputCost();
  console.log('🚀 ~ cost p2pkh:', cost);
  let discardChange = false;
  let funds = (await opt.wallet.getAddressUtxos()).filter(
    (u: UtxoI) => Boolean(!u.token) && u.satoshis > cost
  )[0];

  const decodedCashAddress = decodeCashAddress(opt.wallet.getDepositAddress());
  if (
    typeof decodedCashAddress !== 'string' &&
    decodedCashAddress.type === CashAddressType.p2sh
  ) {
    cost = genesisInputCost(decodedCashAddress.type);
    if (cost > 100000) {
      throw new Error('Fee too high.');
    }

    console.log('🚀 ~ cost multisig:', cost);

    funds = (await opt.wallet.getAddressUtxos()).filter(
      (u: UtxoI) => Boolean(!u.token) && u.satoshis > cost
    )[0];

    if (!funds) {
      throw new Error(
        'Insufficient balance! If you have BCH in your account, please try to consolidate your utxos.'
      );
    }

    discardChange = true;
    console.log('🚀 ~ cost:', cost);
    const change = funds.satoshis - cost;
    console.log('🚀 ~ change:', change);
    // mainnet-js incorrectly calculates relay fee if wallet is multisig
    // handle change ourself
    if (change > 546) {
      const changeSendRequest = new SendRequest({
        cashaddr: opt.wallet!.getDepositAddress(),
        value: change,
        unit: UnitEnum.SATOSHIS,
      });
      requests.push(changeSendRequest);
    }
  }

  // console.log('🚀 ~ genesisInputCost:', cost);
  // const funds = (await opt.wallet.getAddressUtxos()).filter(
  //   (u: UtxoI) => Boolean(!u.token) && u.satoshis > cost
  // )[0];

  if (!funds) {
    throw new Error(
      'Insufficient balance! If you have BCH in your account, please try to consolidate your utxos.'
    );
  }

  const { encodedTransaction, sourceOutputs } =
    await opt.wallet.encodeTransaction(requests, discardChange, {
      checkTokenQuantities: false,
      buildUnsigned: true,
      utxoIds: [funds],
      ensureUtxos: [funds],
    });

  console.log(
    '🚀 ~ decodeTransaction(encodedTransaction):',
    decodeTransaction(encodedTransaction)
  );
  console.log('🚀 ~ encodedTransaction:', encodedTransaction);
  console.log('🚀 ~ sourceOutputs:', sourceOutputs);
  return {
    encoded: encodedTransaction,
    decoded: decodeTransaction(encodedTransaction),
    sourceOutputs,
  };
};
