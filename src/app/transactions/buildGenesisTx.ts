import {
  NFTCapability,
  OpReturnData,
  TestNetWallet,
  TokenI,
  TokenSendRequest,
  UtxoI,
  Wallet,
  hexToBin,
} from 'mainnet-js';

import { DEFAULT_TOKEN_VALUE } from '../constants';
import { calcMinerFee } from '../utils';
import { getInstance } from '../contracts';
import { Utxo } from 'cashscript';
import { decodeTransaction } from '@bitauth/libauth';
import { toCashScript } from '@mainnet-cash/contract';

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

export const genesisCost =
  calcMinerFee({ P2PKH: 3 }, { P2WSH: 1, P2PKH: 2 }) +
  DEFAULT_TOKEN_VALUE * 2 +
  400;

/**
 * If opt.authKey is present the created token will be locked in an AuthGuard contract.
 * If opt.authKey isn't a token or it doesn't conform to the AuthGuard spec, genesis tx
 * will also create genesis for the authKey and opt.authKey utxo will be used as auth-
 * key genesis input.
 */
export const buildGenesisTx = async (
  opt: GenesisOptions
): Promise<GenesisTransaction> => {
  if (opt.input.vout != 0) {
    throw new Error('Genesis input requires v-out 0');
  }

  if (opt.authKey && !opt.authKey?.token?.tokenId && opt.authKey.vout != 0) {
    throw new Error('Genesis input for authKey requires v-out 0');
  }

  const funds = (await opt.wallet.getAddressUtxos()).filter((u: UtxoI) => {
    return Boolean(!u.token) && u.satoshis > genesisCost && u.vout != 0;
  })[0];

  if (!funds) {
    throw new Error('Insufficient balance to fund the transaction');
  }

  const toSpend = [opt.input];

  let authKeyTokenId;
  let authKeyGenesisRequest = null;
  let tokenRecipient = opt.recipient;
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
        cashaddr: opt.recipient || opt.wallet!.getTokenDepositAddress(),
        value: DEFAULT_TOKEN_VALUE,
        tokenId: authKeyTokenId!,
        amount: 0,
        capability: NFTCapability.none,
        commitment: '00',
      });
      toSpend.push(opt.authKey);
    }

    const authGuard = getInstance('authguard-contract', {
      authKeyTokenId: authKeyTokenId as string,
      network: opt.wallet.network,
    });
    tokenRecipient = authGuard?.getTokenDepositAddress();
  }

  toSpend.push(funds);

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
        ...opt.publishBCMR.uris.map((u) =>
          u.replace(/https:\/\/|ipfs:\/\//, '')
        ),
      ])
    );
  }

  const expenses: UtxoI[] = [opt.input];
  if (opt.authKey && !opt.authKey?.token?.tokenId) {
    // only spend authkey during genesis
    expenses.push(opt.authKey);
  }
  expenses.push(funds);
  console.log('EXPENSES', expenses);
  console.log('REQUESTS', requests);

  const { encodedTransaction, sourceOutputs } =
    await opt.wallet.encodeTransaction(requests, false, {
      tokenOperation: 'genesis',
      checkTokenQuantities: false,
      buildUnsigned: true,
      utxoIds: expenses,
      ensureUtxos: expenses,
    });

  console.log('TRANSACTION', decodeTransaction(encodedTransaction));

  return {
    encoded: encodedTransaction,
    decoded: decodeTransaction(encodedTransaction),
    sourceOutputs,
  };
};
