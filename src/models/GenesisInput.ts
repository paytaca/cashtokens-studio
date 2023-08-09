import { BCMR, Mainnet, NFTCapability, OpReturnData, SendRequest, TokenI, TokenSendRequest, UnitEnum, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import calcMinerFee from 'src/utils/calcMinerFee';
import CashStudioToken from './CashStudioToken';
import { decodeTransaction, hexToBin } from '@bitauth/libauth';
export default class GenesisInput implements UtxoI {
  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  private static _processing?:string;
  static processing = ''
  constructor(instance:UtxoI) {
    if(instance.vout !== 0) {
      throw new Error('Genesis input must be a zeroeth decendant output')
    }
    this.txid = instance.txid
    this.vout = instance.vout
    this.satoshis = instance.satoshis
    this.height = instance.height
    this.coinbase = instance.coinbase
    this.token = instance.token
  }

  get utxo():UtxoI {
    return {
      vout: this.vout,
      txid: this.txid,
      satoshis: this.satoshis,
      height: this.height,
      coinbase: this.coinbase,
      token: this.token,
    }
  }

  /**
   * Unwrap utxo
   */
  set utxo(u:UtxoI) {
    if(u.vout !== 0) {
      throw new Error('Genesis input must be a zeroeth decendant output')
    }
    this.vout = u.vout
    this.txid = u.txid
    this.satoshis = u.satoshis
    this.height = u.height
    this.coinbase = u.coinbase
    this.token = u.token
  }

  // static get processing():string|undefined {
  //   return GenesisInput._processing
  // }


  /**
   * Generate genesis inputs from wallet's utxos
   */
  static async generate(ownerWallet:Wallet, qty = 2): Promise<string|undefined> {
    GenesisInput.processing = 'Scanning wallet'
    const fee = calcMinerFee({P2PKH: 1}, {P2PKH: qty})
    const funder = (await ownerWallet.getAddressUtxos()).filter((u:UtxoI)=> Boolean(!u.token) && u.satoshis > (CashStudioToken.DEFAULT_TOKEN_VALUE) + fee)[0]
    if (!funder) {
      throw new Error('Insufficient balance, please try to consolidate your utxos')
    }
    // build tx
    GenesisInput.processing = 'Processing'
    console.log('ADDRESS', ownerWallet!.getDepositAddress())
    const { encodedTransaction, sourceOutputs } = await ownerWallet!.encodeTransaction(
      [new SendRequest({
        cashaddr: ownerWallet!.getDepositAddress(),
        value: CashStudioToken.DEFAULT_TOKEN_VALUE,
        unit: UnitEnum.SATOSHIS
      })],
      false,
      {
        // tokenOperation: 'genesis',
        checkTokenQuantities: false,
        buildUnsigned: true,
        utxoIds: [funder],
        ensureUtxos: [funder]
      }
    )

    const decoded = decodeTransaction(encodedTransaction)
    if (typeof decoded === 'string') {
      throw new Error('Error decoding transaction')
    }
    // request signature
    GenesisInput.processing = 'Waiting for signature'
    console.log(GenesisInput._processing)
    let signResult: {signedTransaction:any} | undefined
    try {
      signResult = await window.paytaca.signTransaction({
          transaction: decoded,
          sourceOutputs: [...sourceOutputs],
          broadcast: false,
          userPrompt: 'Generate genesis inputs'
      })
    } catch (error) {
      console.log(error)
    } finally {
      GenesisInput.processing = ''
    }

    if (!signResult?.signedTransaction) {
      GenesisInput.processing = ''
      return
    }

    GenesisInput.processing = 'Generating genesis inputs'
    const tx = await ownerWallet!.submitTransaction(hexToBin(signResult!.signedTransaction), true)
    // delete GenesisInput.processing
    GenesisInput.processing = ''
    return tx
  }


}
