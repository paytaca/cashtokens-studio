import { BCMR, Mainnet, NFTCapability, OpReturnData, SendRequest, TokenSendRequest, UtxoI, Wallet, binToHex, utf8ToBin } from 'mainnet-js'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin, sha256 } from '@bitauth/libauth'
import CashStudioToken from "./CashStudioToken"
import { AuthChainGuard, AuthGuard, Authchain, CashStudioTokenI, Message, Registry, RegistryPublicationInput } from "./interfaces"
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/utils/getWalletClass'
import constants from 'src/constants'
import toCashScript from 'src/utils/toCashScript'
import { Artifact, SignatureTemplate, Utxo } from 'cashscript'
import { scriptToBytecode } from '@cashscript/utils'
import getByteCount from 'src/utils/getByteCount'

export default class AuthchainIdentity implements CashStudioTokenI, Authchain {
  utxo?: UtxoI
  registry?: RegistryPublicationInput
  ownerWallet?: Wallet
  authGuard?: AuthGuard
  protected _processing?: string
  protected _message?: Message
  constructor(p: {utxo?:UtxoI, registry?: RegistryPublicationInput, ownerWallet?: Wallet}) {
    this.utxo = p.utxo
    this.registry = p.registry
    this.ownerWallet = p.ownerWallet
  }

  get processing(): string | undefined {
    return this._processing
  }
  get message(): Message | undefined {
    return this._message
  }

  /**
   * Publishes registry on chain
   * @returns {Promise<string|undefined>} Promise that resolves to tx or undefined if transaction signing request was cancelled
   */
  async publish(opt?:{buildAuthchain?:boolean}): Promise<string|undefined> {
    return 'delegate to authguard'
  }
  /**
   * Transfers ownership of identity output
   */
  async transfer(newOwnerAddress: string): Promise<string|undefined> {
    return 'delegate to authguard'
  }
  async burn(): Promise<string|undefined> {
    return 'delegate to authguard'
  }
  async issueFungibleTokens(amount:string, to:string) {
    return 'delegate to authguard'
  }


}
