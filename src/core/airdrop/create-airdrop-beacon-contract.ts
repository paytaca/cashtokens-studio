import { type AddressType, Contract,  type Network } from 'cashscript'
import artifact from './AirdropBeacon.json' with { type: 'json'}
import { CustomElectrumNetworkProvider } from 'src/services/electrum'
import { hexToBin, utf8ToBin } from 'bitauth-libauth-v3'

export type CreateAirdropBeaconContractOptions = {
    beaconTokenCategory: string,
    beaconAdminId: string,
    network?: Network
}

export function createAirdropBeaconContract(options: CreateAirdropBeaconContractOptions) {
    const contractOptions = {
        provider: new CustomElectrumNetworkProvider(options.network || 'mainnet'),
        addressType: 'p2sh32' as AddressType
    }

    const contract = new Contract(
        artifact, 
        // [options.beaconNFTCategory.match(/[a-fA-F0-9]{2}/g)!.reverse().join('')],
        [hexToBin(options.beaconTokenCategory).reverse(), utf8ToBin(options.beaconAdminId)],
        contractOptions
    )
    return contract
}

