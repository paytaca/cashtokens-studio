import { type AddressType, Contract, ElectrumNetworkProvider, type Network } from 'cashscript'
import artifact from './Authguard.json' with { type: 'json'}

export type CreateAuthguardContractOptions = {
    authKeyTokenId: string,
    network?: Network
}

export function createAuthguardContract(options: CreateAuthguardContractOptions) {
    
    const contractOptions = {
        provider: new ElectrumNetworkProvider(options.network || 'mainnet'),
        addressType: 'p2sh20' as AddressType
    }

    const contract = new Contract(
        artifact, 
        [options.authKeyTokenId.match(/[a-fA-F0-9]{2}/g)!.reverse().join('')],
        contractOptions
    )
    return contract
}