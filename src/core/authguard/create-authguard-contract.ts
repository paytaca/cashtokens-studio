import { type AddressType, Contract,  type Network } from 'cashscript'
import artifact from './Authguard.json' with { type: 'json'}
import { CustomElectrumNetworkProvider } from 'src/services/electrum'

export type CreateAuthguardContractOptions = {
    authkeyTokenId: string,
    network?: Network
}

export function createAuthguardContract(options: CreateAuthguardContractOptions) {
    const contractOptions = {
        provider: new CustomElectrumNetworkProvider(options.network || 'mainnet'),
        addressType: 'p2sh20' as AddressType
    }

    const contract = new Contract(
        artifact, 
        [options.authkeyTokenId.match(/[a-fA-F0-9]{2}/g)!.reverse().join('')],
        contractOptions
    )
    return contract
}

export function getAuthguardContractAddress(options: CreateAuthguardContractOptions) {
    return createAuthguardContract(options).address
}