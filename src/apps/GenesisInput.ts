import { decodeTransaction, hexToBin } from '@bitauth/libauth';
import { SendRequest, TokenI, UnitEnum, UtxoI, Wallet } from 'mainnet-js';

import calcMinerFee from './utils/calcMinerFee';
import { DEFAULT_TOKEN_VALUE } from './constants';
import { TransactionSigner } from './types';
import submitTransaction from './utils/submitTransaction';

export class GenesisInput implements UtxoI {
  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  transactionSigner?: TransactionSigner;
  private static _processing?: string;
  private _processing?: string;

  constructor(instance: UtxoI, transactionSigner?: TransactionSigner) {
    if (instance.vout !== 0) {
      throw new Error('Genesis input must be a zeroeth decendant output');
    }
    this.txid = instance.txid;
    this.vout = instance.vout;
    this.satoshis = instance.satoshis;
    this.height = instance.height;
    this.coinbase = instance.coinbase;
    this.token = instance.token;
    this.transactionSigner = transactionSigner;
  }

  get utxo(): UtxoI {
    return {
      vout: this.vout,
      txid: this.txid,
      satoshis: this.satoshis,
      height: this.height,
      coinbase: this.coinbase,
      token: this.token,
    };
  }

  /**
   * Unwrap utxo
   */
  set utxo(u: UtxoI) {
    if (u.vout !== 0) {
      throw new Error('Genesis input must be a zeroeth decendant output');
    }
    this.vout = u.vout;
    this.txid = u.txid;
    this.satoshis = u.satoshis;
    this.height = u.height;
    this.coinbase = u.coinbase;
    this.token = u.token;
  }

  static get processing(): string | undefined {
    return GenesisInput._processing;
  }

  static set processing(p: string | undefined) {
    GenesisInput._processing = p;
  }

  get processing(): string | undefined {
    return this._processing;
  }

  set processing(p: string | undefined) {
    this._processing = p;
  }

  /**
   * Generate genesis inputs from wallet's utxos
   */
  async generate(ownerWallet: Wallet, qty = 2): Promise<string | undefined> {
    this._processing = 'Scanning wallet';
    const fee = calcMinerFee({ P2PKH: 1 }, { P2PKH: qty });
    const funder = (await ownerWallet.getAddressUtxos()).filter(
      (u: UtxoI) => Boolean(!u.token) && u.satoshis > DEFAULT_TOKEN_VALUE + fee,
    )[0];
    if (!funder) {
      throw new Error(
        'Insufficient balance! If you have BCH in your account, please try to consolidate your utxos.',
      );
      // if (this.satoshis <= (DEFAULT_TOKEN_VALUE + fee)) {
      //   delete this._processing
      //   throw new Error('Insufficient balance! If you have BCH in your account, please try to consolidate your utxos.')
      // } else {
      //   funder = this.utxo
      // }
      // use this input to fund the transaction
      //if it we can't find a different funder utxo and if it has enough satoshis
    }
    this._processing = 'Processing';
    const { encodedTransaction, sourceOutputs } =
      await ownerWallet!.encodeTransaction(
        [
          new SendRequest({
            cashaddr: ownerWallet!.getDepositAddress(),
            value: DEFAULT_TOKEN_VALUE,
            unit: UnitEnum.SATOSHIS,
          }),
        ],
        false,
        {
          // tokenOperation: 'genesis',
          checkTokenQuantities: false,
          buildUnsigned: true,
          utxoIds: [funder],
          ensureUtxos: [funder],
        },
      );

    const decoded = decodeTransaction(encodedTransaction);
    if (typeof decoded === 'string') {
      throw new Error('Error decoding transaction');
    }
    // request signature
    delete this._processing;
    this._processing = 'Waiting for signature';
    let signResult:
      | { signedTransaction: any; signedTransactionHash?: any }
      | undefined;
    try {
      signResult = await this.transactionSigner?.signTransaction(
        decoded,
        sourceOutputs,
        false,
        'Generate genesis inputs',
      );
    } catch (error: any) {
      delete this._processing;
      throw error;
    } finally {
      delete this._processing;
    }

    if (!signResult?.signedTransaction) {
      delete this._processing;
      return;
    }
    delete this._processing;
    this._processing = 'Submitting Transaction';
    try {
      // const tx = await ownerWallet!.submitTransaction(hexToBin(signResult!.signedTransaction), true)
      // return tx
      return await submitTransaction(signResult, ownerWallet as Wallet);
    } catch (error) {
      throw error;
    } finally {
      // delete GenesisInput.processing
      delete this._processing;
    }
  }

  async updateUtxo(ownerWallet: Wallet, txid: string): Promise<boolean> {
    this._processing = 'Updating';
    const utxoToUse = (await ownerWallet.getAddressUtxos()).filter(
      (u: UtxoI) => (u.txid = txid),
    );
    if (!utxoToUse) return false;
    this.utxo = utxoToUse[0];
    delete this._processing;
    return true;
  }

  /**
   * Generate genesis inputs from wallet's utxos
   */
  static async generate(
    ownerWallet: Wallet,
    qty = 2,
  ): Promise<string | undefined> {
    GenesisInput.processing = 'Scanning wallet';
    const fee = calcMinerFee({ P2PKH: 1 }, { P2PKH: qty });
    const funder = (await ownerWallet.getAddressUtxos()).filter(
      (u: UtxoI) => Boolean(!u.token) && u.satoshis > DEFAULT_TOKEN_VALUE + fee,
    )[0];
    if (!funder) {
      throw new Error(
        'Insufficient balance, please try to consolidate your utxos',
      );
    }
    // build tx
    GenesisInput.processing = 'Processing';
    const { encodedTransaction, sourceOutputs } =
      await ownerWallet!.encodeTransaction(
        [
          new SendRequest({
            cashaddr: ownerWallet!.getDepositAddress(),
            value: DEFAULT_TOKEN_VALUE,
            unit: UnitEnum.SATOSHIS,
          }),
        ],
        false,
        {
          // tokenOperation: 'genesis',
          checkTokenQuantities: false,
          buildUnsigned: true,
          utxoIds: [funder],
          ensureUtxos: [funder],
        },
      );

    const decoded = decodeTransaction(encodedTransaction);
    if (typeof decoded === 'string') {
      throw new Error('Error decoding transaction');
    }
    // request signature
    delete GenesisInput.processing;
    GenesisInput.processing = 'Waiting for signature';
    let signResult: { signedTransaction: any } | undefined;
    try {
      signResult = await window.paytaca.signTransaction({
        transaction: decoded,
        sourceOutputs: [...sourceOutputs],
        broadcast: false,
        userPrompt: 'Generate genesis inputs',
      });
    } catch (error) {
      console.log(error);
    } finally {
      delete GenesisInput.processing;
    }

    if (!signResult?.signedTransaction) {
      delete GenesisInput.processing;
      return;
    }
    delete GenesisInput.processing;
    GenesisInput.processing = 'Submitting Transaction';
    const tx = await ownerWallet!.submitTransaction(
      hexToBin(signResult!.signedTransaction),
      true,
    );
    // delete GenesisInput.processing
    delete GenesisInput.processing;
    return tx;
  }
}
