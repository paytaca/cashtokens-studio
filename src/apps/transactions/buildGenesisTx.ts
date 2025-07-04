import {
  NFTCapability,
  OpReturnData,
  SendRequest,
  TestNetWallet,
  TokenI,
  TokenSendRequest,
  UnitEnum,
  UtxoI,
  Wallet,
  hexToBin,
} from 'mainnet-js';

import { DEFAULT_TOKEN_VALUE } from '../constants'; 
import { calcMinerFee } from '../utils';
import { getInstance } from '../contracts';
import {
  cashAddressToLockingBytecode,
  CashAddressType,
  decodeCashAddress,
  decodeTransaction,
  lockingBytecodeToCashAddress,
} from '@bitauth/libauth';

export type GenesisOptions = {
  /**
   * The genesis input
   */
  input: UtxoI;
  /**
   * The token specification
   */
  token: TokenI;
  /**
   * The wallet that owns the genesis input. The default recipient of the authKey
   * nft if GenesisOptions.authKey is specified AND GenesisOptions.recipient is
   * undefined. The defualt recipient of the genesis token if not using
   * AuthGuard, i.e. authKey is undefined.
   */
  wallet: Wallet | TestNetWallet;
  authKey?: UtxoI;
  recipient?: string;
  publishBCMR?: {
    uris: string[];
    contentHash: string;
  };
};

export type GenesisTransaction = {
  encoded: any;
  decoded: any;
  sourceOutputs: any;
};

// export const genesisCost =
//   calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH: 2 }) +
//   DEFAULT_TOKEN_VALUE * 2 +
//   400;

export const genesisCost = (walletAddressType?: CashAddressType) => {
  let cost =
    calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH: 2 }) + DEFAULT_TOKEN_VALUE;
  if (walletAddressType && walletAddressType === CashAddressType.p2sh) {
    cost =
      calcMinerFee({ 'MULTISIG-P2SH:19-20': 1 }, { P2SH: 3 }) +
      DEFAULT_TOKEN_VALUE;
  }
  return cost - 1500;
};
/**
 * If opt.authKey is present the created token will be locked in an AuthGuard contract.
 * If opt.authKey isn't a token or it doesn't conform to the AuthGuard spec, genesis tx
 * will also create genesis for the authKey and opt.authKey utxo will be used as auth-
 * key genesis input.
 */
export const buildGenesisTx = async (
  opt: GenesisOptions
): Promise<GenesisTransaction> => {
  console.log('OPT', opt)
  if (opt.input.vout != 0) {
    throw new Error('Genesis input requires v-out 0');
  }

  if (opt.authKey && !opt.authKey?.token?.tokenId && opt.authKey.vout != 0) {
    throw new Error('Genesis input for authKey requires v-out 0');
  }

  let cost = genesisCost();
  let discardChange = false;

  let funds = (await opt.wallet.getAddressUtxos()).filter((u: UtxoI) => {
    return Boolean(!u.token) && u.satoshis > cost && u.vout !== 0;
  })[0];
  const decodedCashAddress = decodeCashAddress(opt.wallet.getDepositAddress());
  
  if (
    typeof decodedCashAddress !== 'string' &&
    decodedCashAddress.type === CashAddressType.p2sh
  ) {
    cost = genesisCost(decodedCashAddress.type);

    console.log('🚀 ~ cost multisig:', cost);

    funds = (await opt.wallet.getAddressUtxos()).filter(
      (u: UtxoI) => Boolean(!u.token) && u.satoshis > cost && u.vout !== 0
    )[0];

    if (!funds) {
      throw new Error(
        'Insufficient balance! If you have BCH in your account, please try to consolidate your utxos.'
      );
    }

    discardChange = true;
    // console.log('🚀 ~ cost:', cost);
    // console.log('🚀 ~ change:', change);
    // mainnet-js incorrectly calculates relay fee if wallet is multisig
    // handle change ourself
    // if (change > 546) {
    //   const changeSendRequest = new SendRequest({
    //     cashaddr: opt.wallet!.getDepositAddress(),
    //     value: change,
    //     unit: UnitEnum.SATOSHIS,
    //   });
    //   requests.push(changeSendRequest);
    // }
  }

  if (cost > 100000) {
    throw new Error(`suspiciously high fee of ${cost} sats. Please contact admin.`);
  }

  if (!funds) {
    throw new Error('Insufficient balance to fund the transaction');
  }

  const change = funds.satoshis - cost
  let authKeyTokenId;
  let authKeyGenesisRequest = null;
  const lockingBytecode: any = cashAddressToLockingBytecode(opt.wallet!.getDepositAddress())
  const walletTokenDepositAddress = lockingBytecodeToCashAddress(
    lockingBytecode.bytecode, lockingBytecode.prefix, { tokenSupport: true }
  ) as string

  let tokenRecipient = opt.recipient || walletTokenDepositAddress;

  console.log('OPT', opt)
  if (opt.authKey) {
    // we are using authguard
    if (opt.authKey.token?.tokenId) {
      if (opt.authKey.token.commitment != '00') {
        throw new Error(
          'Trying to use an authkey that does not conform to AuthGuard standard'
        );
      }
      // using existing authkey
      authKeyTokenId = opt.authKey.token?.tokenId;
    } else {
      // will create authKey Genesis, using opt.authKey as genesis input
      authKeyTokenId = opt.authKey.txid;

      authKeyGenesisRequest = new TokenSendRequest({
        cashaddr: walletTokenDepositAddress,
        value: DEFAULT_TOKEN_VALUE,
        tokenId: authKeyTokenId!,
        amount: 0,
        capability: NFTCapability.none,
        commitment: '00',
      });
    }

    const authGuard = getInstance('authguard-contract', {
      authKeyTokenId: authKeyTokenId as string,
      network: opt.wallet.network,
    });
    tokenRecipient = authGuard?.getTokenDepositAddress() as string;
  }

  const requests: any[] = [
    new TokenSendRequest({
      cashaddr: tokenRecipient as string,
      value: DEFAULT_TOKEN_VALUE,
      tokenId: opt.token.tokenId,
      amount: opt.token.amount,
      capability: opt.token.capability,
      commitment: opt.token.commitment,
    }),
  ];

  if (authKeyGenesisRequest) {
    requests.push(authKeyGenesisRequest);
  }

  if (opt.publishBCMR) {
    requests.push(
      OpReturnData.fromArray([
        'BCMR',
        hexToBin(opt.publishBCMR.contentHash),
        ...opt.publishBCMR.uris.map((u) => u.replace(/https:\/\//, '')),
      ])
    );
  }

  if (change > 546) {
    const changeSendRequest = new SendRequest({
      cashaddr: opt.wallet!.getDepositAddress(),
      value: change,
      unit: UnitEnum.SATOSHIS,
    });
    requests.push(changeSendRequest);
  }

  const expenses: UtxoI[] = [opt.input];
  if (opt.authKey && !opt.authKey?.token?.tokenId) {
    // only spend authkey during genesis
    expenses.push(opt.authKey);
  }

  expenses.push(funds);

  const { encodedTransaction, sourceOutputs } =
    await opt.wallet.encodeTransaction(requests, discardChange, {
      tokenOperation: 'genesis',
      checkTokenQuantities: false,
      buildUnsigned: true,
      utxoIds: expenses,
      ensureUtxos: expenses,
    });

  return {
    encoded: encodedTransaction,
    decoded: decodeTransaction(encodedTransaction),
    sourceOutputs,
  };
};
