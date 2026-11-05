import { type AddressType, Contract,  type Network } from 'cashscript'
import artifact from './artifacts/PoolManager.json' with { type: 'json'}
import { CustomElectrumNetworkProvider } from 'src/services/electrum'

export type CreatePoolManagerContractParams = {
    poolOwnerPkh: string, // Public Key Hash Hex 
    network?: Network
}

export function createPoolManagerContract(params: CreatePoolManagerContractParams) {

    const contractOptions = {
        provider: new CustomElectrumNetworkProvider(params.network || 'mainnet'),
        addressType: 'p2sh32' as AddressType
    }
    const poolOwnerPkhInitializedBytecode = artifact.bytecode.replace('<withdraw_pkh>', params.poolOwnerPkh)
    artifact.bytecode = poolOwnerPkhInitializedBytecode
    const contract = new Contract(
        artifact, 
        [],
        contractOptions
    )
    return contract
}

