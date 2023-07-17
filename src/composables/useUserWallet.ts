import getWalletClass from 'src/utils/getWalletClass'
import useStore from './useStore'
import { Wallet } from 'mainnet-js'

export default async(): Promise<Wallet|null> => {
  const { user } = useStore()
  const W = getWalletClass()
  let wallet = null
  if (user.connectedPaytacaAddress) {
    wallet = await W.watchOnly(user.connectedPaytacaAddress)
  }
  return wallet
}
