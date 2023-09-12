import { UtxoI, Wallet, NetworkType } from 'mainnet-js'
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/app/utils/getWalletClass'

export class Watchtower {
  processing?:string
  async subscribe(address: string): Promise<any> {
    this.processing = 'Subscribing address to watchtower'
    const res = await fetch(`${process.env.WATCHTOWER_API}/subscription/`, {
      method: 'POST',
      body: JSON.stringify({address: address})
    })
    delete this.processing 
    return res
  }
}
