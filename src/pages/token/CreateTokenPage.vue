<template>
    <q-page class="bg-dark-page">
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-card flat class="bg-dark rounded-borders">
                    {{ stringify(genesisInputs) }}
                    <q-card-title class="text-h5 text-weight-bold text-grey-6 flex items-center q-gutter-x-sm q-pa-lg">
                        <span>Create Token</span>
                        <q-icon name="mdi-creation" size="lg" />
                    </q-card-title>
                    <q-card-section>
                        <q-stepper v-model="step" ref="stepperRef" flat header-class="bg-dark" class="bg-dark">
                            <q-step :name="1" title="Token ID" icon="vpn_key" :done="genesisInputs.length >= 1"
                                header-nav>
                                <q-separator class="q-my-lg" />
                                <q-banner class="text-justify q-mb-md rounded-borders bg-grey-9" icon="info">
                                    The Token ID/Category comes from one of your unspent BCH's txid.
                                </q-banner>
                                <div v-if="genesisInputs.length === 0">
                                    <FormField>
                                        <label>Token ID/Category candidate</label>
                                        <div class="flex items-center q-gutter-x-md">
                                            <span class="text-caption grey-6">No available Token ID/Category
                                                candidate <q-icon name="info"></q-icon></span>
                                            <q-btn flat no-caps dense color="secondary" @click="onGenerateGenesisInput">
                                                Click Here to Generate
                                            </q-btn>
                                        </div>
                                    </FormField>
                                </div>
                                <div v-else>
                                    <FormField>
                                        <label>Token ID/Category candidate</label>
                                        <q-input :model-value="genesisInputs[0]!.txid" readonly outlined>
                                            <template v-slot:prepend>
                                                <q-icon name="done_all" color="bch"></q-icon>
                                            </template>
                                            <template v-slot:append>
                                                <CopyText :text="genesisInputs[0]!.txid" />

                                            </template>
                                        </q-input>
                                    </FormField>
                                </div>
                                <q-stepper-navigation class="flex justify-end q-gutter-sm">
                                    <q-btn :disable="genesisInputs.length === 0" @click="step = 2" color="primary"
                                        label="Next" />
                                </q-stepper-navigation>
                            </q-step>

                            <q-step :name="2" title="Storage" icon="lock" :done="isStep2Done" header-nav dense>
                                <q-separator class="q-my-lg" />
                                <q-banner class="text-justify q-mb-md rounded-borders bg-grey-9" icon="info">
                                    Choose where to store your token's identity — either in a new Authguard Vault or an
                                    existing one.
                                </q-banner>
                                <FormField>
                                    <label>Token Identity Storage Option</label>
                                    <q-option-group v-model="vaultMode" :options="[
                                        { label: 'New (Recommended)', value: 'new' },
                                        { label: 'Existing', value: 'existing', disable: authkeys.length === 0 },
                                    ]" type="radio" inline dense class="text-caption" />
                                </FormField>

                                <template v-if="vaultMode === 'new'">
                                    <FormField class="q-mt-md">
                                        <label>Authguard Vault Key ID</label>
                                        <div v-if="genesisInputs.length < 2" class="flex items-center q-gutter-x-md">
                                            <span class="text-caption grey-6">No available Key candidate <q-icon
                                                    name="info"></q-icon></span>
                                            <q-btn flat no-caps dense color="secondary" @click="onGenerateGenesisInput">
                                                Click Here to Generate
                                            </q-btn>
                                        </div>
                                        <q-input v-else :model-value="genesisInputs[1]!.txid" readonly>
                                            <template v-slot:prepend>
                                                <q-icon name="done_all" color="bch"></q-icon>
                                            </template>
                                            <template v-slot:append>
                                                <CopyText :text="genesisInputs[1]!.txid" />
                                            </template>
                                        </q-input>
                                    </FormField>
                                </template>
                                <template v-else>
                                    <FormField class="q-mt-md">
                                        <label for="">Authguard Vault Address</label>
                                        <q-select v-model="authKeySelected" :options="existingVaultOptions" outlined
                                            emit-value map-options />
                                    </FormField>
                                </template>
                                <q-stepper-navigation class="flex justify-end q-gutter-sm">
                                    <q-btn flat @click="step = 1" label="Back" />
                                    <q-btn @click="step = 3" color="primary" label="Next"
                                        :disable="vaultMode === 'new' ? genesisInputs.length < 2 : !authKeySelected" />
                                </q-stepper-navigation>
                            </q-step>

                            <q-step :name="3" title="Spec" icon="token" header-nav>
                                <q-separator class="q-my-lg" />
                                <q-banner class="text-justify q-mb-md rounded-borders bg-grey-9" icon="info">
                                    Configure your token's specifications including type, amount, name, and metadata.
                                </q-banner>
                                <div class="q-gutter-y-md">
                                    <q-select v-model="tokenType" :options="typeOptions" label="Type *" filled
                                        emit-value map-options :rules="[val => !!val || 'Type is required']"
                                        class="full-width" />

                                    <q-input v-if="tokenType === 'Fungible' || tokenType === 'Mixed'"
                                        v-model="token.amount" label="Token Amount *" filled :rules="[
                                            val => !!val || 'Amount is required',
                                            val => val >= 0 || 'Invalid amount',
                                            validateVmNumber
                                        ]" class="full-width" clearable>
                                        <template v-slot:append>
                                            <q-btn @click="token.amount = MAX_VM_NUMBER.toString()"
                                                text-color="warning">Max</q-btn>
                                        </template>
                                        <template v-slot:hint>
                                            Example: 1000(No decimals), 2000.00 (2 decimals)
                                        </template>
                                    </q-input>

                                    <q-input v-if="computedDecimals > 0" :model-value="computedDecimals"
                                        label="Decimals" filled readonly hint="Auto-computed" class="full-width" />

                                    <template v-if="tokenType.startsWith('Non-Fungible') || tokenType === 'Mixed'">
                                        <q-select v-model="token.nft.capability"
                                            :options="['none', 'mutable', 'minting']" label="Capability *" filled
                                            :rules="[val => !!val || 'Capability is required']" class="full-width" />
                                        <q-input v-model="token.nft.commitment" label="Commitment (Optional)" filled
                                            hint="Hex String" class="full-width" />
                                    </template>

                                    <q-input v-model="identitySnapshot.name" label="Name *" filled
                                        :rules="[val => !!val || 'Name is required']" class="full-width" />

                                    <q-input v-model="identitySnapshot.description" label="Description" filled
                                        class="full-width" />

                                    <q-input v-model="identitySnapshot.token!.symbol" label="Token Symbol *" filled
                                        type="text"
                                        @update:model-value="val => identitySnapshot.token!.symbol = (val as string)?.toUpperCase()"
                                        :rules="[val => !!val || 'Symbol is required']" class="full-width" />

                                    <q-input v-model="identitySnapshot.uris!.icon" filled label="Icon"
                                        placeholder="Enter icon's URL or upload an icon" class="full-width">
                                        <template v-slot:prepend>
                                            <q-avatar>
                                                <q-img v-if="tokenIconPreviewUri" :src="tokenIconPreviewUri">
                                                </q-img>
                                                <q-icon v-else name="broken_image"></q-icon>
                                            </q-avatar>
                                        </template>
                                        <template v-slot:append>
                                            <div @click.stop="iconFileRef.pickFiles()">
                                                <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
                                                <span v-else>
                                                    <q-btn icon="upload_file" class="cursor-pointer"
                                                        text-color="warning" label="Upload Icon" />
                                                </span>
                                            </div>
                                        </template>
                                    </q-input>

                                    <q-file ref="iconFileRef" v-model="iconFile"
                                        @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
                                        :disable="iconFileUploading" outlined bottom-slots class="hidden">
                                    </q-file>
                                </div>
                                <q-stepper-navigation>
                                    <div class="flex justify-end q-gutter-sm">
                                        <q-btn flat @click="step = 2" label="Back" />
                                        <q-btn @click="onSubmit" color="primary" label="Create Token" />
                                    </div>
                                </q-stepper-navigation>
                            </q-step>
                        </q-stepper>
                    </q-card-section>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, onMounted, ref, triggerRef, watch } from 'vue'
import { useQuasar } from 'quasar'
import { MAX_VM_NUMBER } from 'src/core/constants'
import { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import { isSquareImage } from 'src/core/utils/is-square-image'
import { uploadFile } from 'src/core/ipfs/upload-file'
import { NFTCapability, Utxo } from 'mainnet-js-v3'
import { shortenTokenId } from 'src/core/utils'
import { UtxoWithPath } from 'src/core/types'
import { createToken, isBroadcastSuccess } from 'src/core/transaction'
import { createTokenRegistry } from 'src/core/bcmr'
import { db } from 'src/core/client-db'
import { useRoute, useRouter } from 'vue-router'
import { broadcast } from 'src/core/transaction/broadcast'
import { createGenesisInput } from 'src/core/transaction/create-genesis-input'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { filterAuthKeys, getAuthguardContractAddress } from 'src/core/authguard'
import { shortenCashAddress } from 'src/core/utils'
import FormField from 'src/components/FormField.vue'
import { filterGenesisInputs } from 'src/core/wallet'
import { TokenType } from 'src/core/types'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { BaseWallet } from 'mainnet-js-v3'
import { useAuthguardStore } from 'src/stores/authguard'
import { stringify, importMetadataRegistry } from 'bitauth-libauth-v3'
import { NetworkType } from 'mainnet-js'
import CopyText from 'src/components/CopyText.vue'
import { DEFAULT_TOKEN_VALUE } from 'src/apps'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const {
    manager,
    wallet
} = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { loadAuthkeys } = authguardStore

const typeOptions: TokenType[] = ['Fungible', 'NonFungible', 'Mixed']

const identitySnapshot = ref<IdentitySnapshot>({
    name: '',
    description: '',
    token: {
        category: '',
        symbol: '',
        nfts: {
            parse: {
                bytecode: '',
                types: {}
            }
        }
    },
    uris: {
        icon: ''
    }
})

const tokenIconPreviewUri = computed(() => {
    const uri = identitySnapshot.value?.uris?.icon
    if (identitySnapshot.value?.uris?.icon) {
        if (uri?.startsWith('ipfs://')) {
            return `/api/ipfs/${uri.replace('ipfs://', '')}`
        }
        return identitySnapshot.value?.uris?.icon
    }
    return ''
})

const token = ref({
    amount: '0',
    nft: {
        capability: NFTCapability.minting,
        commitment: ''
    }
})

const vaultMode = ref<'new' | 'existing'>('new')
const step = ref(1)
const stepperRef = ref()
const tokenType = ref<TokenType>(typeOptions[0]!)
const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const authKeySelected = ref<Utxo>()
const authKeyOptions = computed(() => {
    const options = authkeys.value?.map(u => {
        return {
            label: shortenTokenId(u.token!.category as string) + ' [Existing AuthKey]',
            value: u
        }
    })
    if (genesisInputs.value?.length >= 2) {
        // Use the 2nd genesis input for authkey
        options.unshift({
            label: shortenTokenId(genesisInputs.value[1]!.txid) + ' [Generate New]',
            value: genesisInputs.value[1]!
        })
    }
    return options
})

const isStep2Done = computed(() =>
    vaultMode.value === 'new'
        ? genesisInputs.value.length >= 2
        : !!authKeySelected.value
)

const existingVaultOptions = computed(() =>
    authkeys.value.map(u => ({
        label: shortenCashAddress(getAuthguardContractAddress({
            authkeyTokenId: u.token!.category as string,
            network: import.meta.env.VITE_BCH_NETWORK as any
        })),
        value: u
    }))
)

const authkeys = ref<UtxoWithPath[]>([])
const genesisInputs = ref<UtxoWithPath[]>([])

// Logic to count digits after the decimal point
const computedDecimals = computed(() => {
    const amountStr = token.value.amount || ''
    if (!String(amountStr).includes('.')) return 0

    const parts = String(amountStr).split('.')
    return parts[1] ? parts[1].length : 0
})

const validateVmNumber = (val: string) => {
    if (!val) return true
    try {
        const amountStr = val.toString()
        const parts = amountStr.split('.')
        const decimals = computedDecimals.value

        // Calculate the raw VM integer using a BigInt multiplier
        const multiplier = BigInt(10 ** decimals)
        const integerPart = BigInt(parts[0] as string)
        const fractionalPart = decimals > 0 ? BigInt(parts[1] as string) : 0n

        const vmNumber = (integerPart * multiplier) + fractionalPart

        if (vmNumber > MAX_VM_NUMBER) {
            return `Exceeds max VM limit (${MAX_VM_NUMBER})`
        }
        return true
    } catch (e) {
        console.log(e)
        return 'Invalid amount'
    }
}

const onGenerateGenesisInput = async () => {
    const loadingGroup = $q.loading.show({
        group: 'ctlg',
        message: 'Preparing. Checking wallet for inputs...'
    })

    try {

        loadingGroup({
            message: 'Checking wallet for inputs...'
        })

        const genesisInputCandidates = new Set()

        genesisInputs.value.forEach((utxo) => {
            genesisInputCandidates.add(`$${utxo.txid}:0`)
        })

        const funderUtxos = ((wallet.value.utxos || []) as UtxoWithPath[]).filter((utxo) => {
            return !genesisInputCandidates.has(`${utxo.txid}:0`) || utxo.satoshis > DEFAULT_TOKEN_VALUE
        })

        if (funderUtxos.length === 0) {
            $q.notify({ type: 'Error', message: 'Insufficient BCH balance' })
            return
        }

        loadingGroup({
            message: 'Preparing transaction...'
        })

        const signRequest = createGenesisInput({
            recipientAddress: wallet.value.getDepositAddress(0),
            funderUtxos,
            network: import.meta.env.VITE_BCH_NETWORK as any,
            feeRateSatsPerKb: BigInt(import.meta.env.VITE_TX_FEE_RATE_SATS_PER_KB)
        })

        loadingGroup({
            message: 'Waiting for approval. Please check your wallet...'
        })
        let response: any = {}

        response = await manager.value?.signTransaction(signRequest);

        loadingGroup({
            message: 'Broadcasting transaction, please wait...'
        })

        const broadcastResponse = await broadcast(response.signedTransaction)

        if (!broadcastResponse.ok) throw new Error('Error broadcasting transaction')

        const broadcastResult = await broadcastResponse.json()

        if (!isBroadcastSuccess(broadcastResult)) throw new Error(broadcastResult.error)

        loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
        })

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
        })

        loadingGroup()

        await db.saveActivity({
            event: `Created genesis input`,
            txid: broadcastResult.txid,
            status: 'success'
        })

        await wallet.value.sync()

        triggerRef(wallet)

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: `Successfully created genesis input!`,
                txid: broadcastResult.txid
            }
        }).onOk(() => {
            genesisInputs.value = filterGenesisInputs(wallet.value.utxos || [])
            authkeys.value = filterAuthKeys(wallet.value.utxos || []) as UtxoWithPath[]
        })

    } catch (error) {
        $q.notify({ type: 'Error', message: `Error: ${error}` })
    } finally {
        loadingGroup()
    }
}

const onSubmit = async () => {

    const loadingGroup = $q.loading.show({
        group: 'create-token-loading-group',
        message: 'Preparing. Checking wallet for inputs...'
    })

    let contentHash: string | undefined

    try {

        if (!wallet?.value?.utxos || wallet.value?.utxos?.length === 0) {
            return $q.notify({
                type: 'Error',
                message: 'Insufficient balance'
            })
        }

        const genesisInput = genesisInputs.value[0]
        const authKeyInput = authKeySelected.value
        if (!genesisInput) {
            return $q.notify({
                type: 'Error',
                message: 'Missing required genesis input'
            })
        }
        if (!authKeyInput) {
            return $q.notify({
                type: 'Error',
                message: 'Missing required authkey'
            })
        }
        const authbase = genesisInput.txid

        loadingGroup({
            message: 'Creating token registry...'
        })

        if (tokenType.value === 'Fungible') {
            delete identitySnapshot.value.token!.nfts
        }
        identitySnapshot.value.token!.category = authbase
        identitySnapshot.value.token!.decimals = computedDecimals.value ?? 0
        identitySnapshot.value.token!.decimals = Number(identitySnapshot.value.token!.decimals)

        const { contentHash: ch, registry } = createTokenRegistry({
            authbase,
            identitySnapshot: JSON.parse(JSON.stringify(identitySnapshot.value)),
            authKeyNftCategory: authKeyInput.token?.category || authKeyInput.txid
        })

        const validatedRegistryOrError = importMetadataRegistry(registry)

        if (typeof (validatedRegistryOrError) === 'string') throw new Error(validatedRegistryOrError)

        contentHash = ch

        const savedRegistry = await db.registry
            .where('contentHash')
            .equals(contentHash)
            .first()

        let uris: string[] = savedRegistry?.publicationUris || []

        const registryJson = JSON.stringify(registry)

        if (uris?.length === 0) {
            loadingGroup({
                message: 'Uploading token registry to IPFS...'
            })

            try {
                const registryBlob = new Blob([registryJson], { type: 'application/json' })
                const uploadResult = await uploadFile(registryBlob, 'bitcoin-cash-metadata-registry.json')
                if (!uploadResult.cid) {
                    throw new Error(`Error uploading registry to IPFS`)
                }
                uris = [`ipfs://${uploadResult.cid}`]
                loadingGroup({
                    message: `Upload success, uri = ${uris[0]}`
                })
            } catch (error) {
                loadingGroup()
                return $q.notify({
                    type: 'Error',
                    message: 'Error saving registry to IPFS. Try refreshing page. If problem persist please contact admin.'
                })
            }
        }
        if (!savedRegistry) {
            await db.createNewRegistry({
                publicationUris: uris,
                contentHash,
                rawRegistry: new Blob([JSON.stringify(registry)], { type: 'application/json' }),
                authbase
            })
        }

        loadingGroup({
            message: 'Preparing transaction...'
        })

        if (uris.length === 0) throw new Error('Error uploading registry to IPFS')

        const tokenSupply = BigInt(token.value.amount.replace('.', ''))

        const createTokenArgs = {
            genesisInputUtxoId: `${genesisInput.txid}:${genesisInput.vout}` as `${string}:${number}`,
            authkeyUtxoId: `${authKeyInput.txid}:${authKeyInput.vout}` as `${string}:${number}`,
            authkeyRecipientAddress: wallet.value.getTokenDepositAddress(0) as string,
            tokenSpec: { ...token.value, amount: tokenSupply },
            sourceUtxos: wallet.value.utxos,
            registryPublicationData: {
                contentHash,
                uris
            },
            feeRateSatsPerKb: BigInt(import.meta.env.VITE_TX_FEE_RATE_SATS_PER_KB)
        }

        loadingGroup({
            message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
        })
        let response: any = {}

        const createTokenSignRequest = createToken(createTokenArgs)

        response = await manager.value?.signTransaction(createTokenSignRequest);

        loadingGroup({
            message: 'Broadcasting transaction, please wait...'
        })

        const broadcastResponse = await broadcast(response.signedTransaction)

        if (!broadcastResponse.ok) throw new Error('Error broadcasting transaction')

        const broadcastResult = await broadcastResponse.json()

        if (!isBroadcastSuccess(broadcastResult)) throw new Error(broadcastResult.error)

        await db.setRegistryPublished(authbase, contentHash)

        loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
        })

        const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
        await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
        })


        loadingGroup()

        await db.saveActivity({
            event: `Created ${identitySnapshot.value.token!.symbol} Token`,
            txid: broadcastResult.txid,
            status: 'success'
        })

        await loadAuthkeys(wallet.value, true)

        triggerRef(wallet)

        $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
                statusType: 'success',
                statusText: `${identitySnapshot.value.token!.symbol} created successfully. An accompanying NFT was sent to your address. That NFT serves as your token's authentication key. Make Sure you don't lose it.`,
                txid: broadcastResult.txid
            }
        }).onOk(() => {
            router.push('/dashboard#created')
        })

    } catch (error) {
        if (contentHash) {
            await db.registry.where('contentHash').equals(contentHash).delete()
        }
        $q.notify({
            type: 'Error',
            message: 'Error creating transaction: ' + error
        })
    } finally {
        loadingGroup()
    }

}

const initializeDefaultAuthKey = () => {
    authKeySelected.value = authKeyOptions.value?.[0]?.value as Utxo
}


watch(() => iconFile.value, async (v) => {
    if (v) {
        const squareIcon = isSquareImage(v)
        if (!squareIcon) {
            return $q.dialog({
                message: `Please provide a square icon. Recommended dimension is 400px by 400px.
        Icons should also be suitable for display against light and dark backgrounds. Transparency is supported.`
            })
        }

        if (iconPreviewUrl.value) {
            URL.revokeObjectURL(iconPreviewUrl.value)
        }

        iconPreviewUrl.value = URL.createObjectURL(iconFile.value)
        iconFileUploading.value = true
        try {
            const filename = `${identitySnapshot.value.token!.category}` || 'test.jpeg'
            const uploadResponse = await uploadFile(iconFile.value, filename)
            router.replace({
                query: {
                    ...route.query,
                    iconCid: uploadResponse.cid
                }
            })
            identitySnapshot.value.uris!.icon = `ipfs://${uploadResponse.cid}`
        } catch (error) {
            console.log(error)
        } finally {
            iconFileUploading.value = false
        }
    }
})

watch(() => authKeyOptions.value, (options) => {
    if (options.length > 0) {
        initializeDefaultAuthKey()
    }
})

watch(() => wallet.value.ready, (ready, readyPrev) => {
    if (ready !== readyPrev) {
        authkeys.value = filterAuthKeys(wallet.value.utxos || []) as Utxo[]
    }
})

onMounted(async () => {
    await wallet.value.sync()
    triggerRef(wallet)
    if (route.query.iconCid) {
        identitySnapshot.value.uris = {
            icon: `ipfs://${route.query.iconCid}`
        }
    }
    if (wallet.value.ready) {
        authkeys.value = filterAuthKeys(wallet.value.utxos || []) as UtxoWithPath[]
        genesisInputs.value = filterGenesisInputs(wallet.value.utxos || [])
    }
})

</script>

<style lang="scss" scoped>
:deep(.q-stepper__header) {
    flex-wrap: nowrap;
    overflow-x: auto;
}

:deep(.q-stepper--horizontal .q-stepper__step-inner) {
    padding: 0px
}
</style>