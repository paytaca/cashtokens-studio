import { ElectrumClient } from '@electrum-cash/network'

export default async ({ txHash, address, timeout = 5000, chipnet = false }: { address: string, txHash: string, timeout?: number, retries?: number, chipnet?: boolean} ) => {
    const ec = new ElectrumClient('Cashtokens Studio', '1.4.1', chipnet ? 'chipnet.bch.ninja' :'bch.imaginary.cash')
    await ec.connect()
    const maxTries = 5
    const interval = timeout / maxTries
    let tries = 0
    await new Promise((resolve, reject) => {
        const i = setInterval(() => {
           tries = tries + 1
           ec.request('blockchain.address.get_mempool', address)
            .then((transactions:any) => {
                if (transactions.find((t: { tx_hash: string }) => t.tx_hash === txHash )) {
                    clearInterval(i)
                    resolve(true)
                }
                if (tries > maxTries) {
                    clearInterval(i)
                    reject('Request timed out verifying tx in mempool. Please check address history in explorer.')
                }
           })
           .catch((e) => reject(e))
        }, interval)
    })
}
 