<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-8">
                <q-card flat bordered>
                    <q-card-section>
                        <div class="text-h5">Create Token</div>
                    </q-card-section>
                    <q-card-section v-if="wzWalletGenesisInputUtxos.length === 0">
                        <q-banner>
                            Creating a new token (token genesis) requires a `genesis input`. A valid genesis input is
                            just unspent BCH which is the 1st output of a previous transaction. <q-btn no-caps dense
                                text-color="primary" @click="onGenerateGenesisInput">Click here to generate</q-btn>
                        </q-banner>
                    </q-card-section>
                    <q-card-section
                        v-else-if="wzWalletAuthKeyUtxos.length === 0 && wzWalletGenesisInputUtxos.length < 2">
                        <q-banner>
                            Creating a new token in CashTokens Studio requires an AuthKey. CashTokens Studio didn't find
                            any
                            AuthKey NFT from your wallet. We need to generate an AuthKey on the fly, this is a `token
                            genesis`
                            transaction so it also need an unspent BCH that was the first output of a previous
                            transaction (genesis input).<q-btn no-caps dense text-color="primary"
                                @click="onGenerateGenesisInput">Click here to generate</q-btn>
                        </q-banner>
                    </q-card-section>
                    <q-card-section>
                        <q-form @submit="onSubmit" class="q-gutter-y-md" greedy>
                            <q-select v-model="authKeySelected" :options="authKeyOptions" label="AuthKey *" filled
                                emit-value map-options :rules="[val => !!val || 'Type is required']"
                                class="full-width" />

                            <q-select v-model="tokenType" :options="typeOptions" label="Type *" filled emit-value
                                map-options :rules="[val => !!val || 'Type is required']" class="full-width" />

                            <!-- Fungible Logic -->
                            <q-input v-if="tokenType === 'Fungible' || tokenType === 'Mixed'"
                                v-model.number="token.amount" type="number" label="Token Amount *" filled :rules="[
                                    val => !!val || 'Amount is required',
                                    val => val >= 0 || 'Invalid amount',
                                    validateVmNumber
                                ]" class="full-width" clearable>
                                <template v-slot:append>
                                    <q-btn @click="token.amount = MAX_VM_NUMBER.toString()"
                                        text-color="warning">Max</q-btn>
                                </template>
                            </q-input>

                            <!-- Show Decimals only if > 0 -->
                            <q-input v-if="computedDecimals > 0" :model-value="computedDecimals" label="Decimals" filled
                                readonly hint="Auto-computed" class="full-width" />

                            <!-- Non-Fungible Logic -->
                            <template v-if="tokenType.startsWith('Non-Fungible') || tokenType === 'Mixed'">
                                <q-select v-model="token.nft.capability" :options="['none', 'mutable', 'minting']"
                                    label="Capability *" filled :rules="[val => !!val || 'Capability is required']"
                                    class="full-width" />

                                <q-input v-model="token.nft.commitment" label="Commitment (Optional)" filled
                                    hint="Hex String" class="full-width" />
                            </template>

                            <q-input v-model="identitySnapshot.name" label="Name *" filled
                                :rules="[val => !!val || 'Name is required']" class="full-width" />

                            <q-input v-model="identitySnapshot.description" label="Description" filled
                                class="full-width" />

                            <q-input v-model="identitySnapshot.token!.symbol" label="Token Symbol *" filled type="text"
                                @update:model-value="val => identitySnapshot.token!.symbol = (val as string)?.toUpperCase()"
                                :rules="[val => !!val || 'Symbol is required']" class="full-width" />

                            <q-input v-model="identitySnapshot.uris!.icon" filled label="Icon"
                                placeholder="Enter icon's URL or upload an icon" class="full-width">
                                <template v-slot:prepend>
                                    <q-avatar>
                                        <q-img v-if="identitySnapshot.uris!.icon" :src="identitySnapshot.uris!.icon">
                                        </q-img>
                                        <q-icon v-else name="broken_image"></q-icon>
                                    </q-avatar>
                                </template>
                                <template v-slot:append>
                                    <div @click.stop="iconFileRef.pickFiles()">
                                        <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
                                        <span v-else>
                                            <q-btn icon="upload_file" class="cursor-pointer" text-color="warning"
                                                label="Upload Icon" />
                                        </span>
                                    </div>
                                </template>
                            </q-input>
                        </q-form>
                        <q-file ref="iconFileRef" v-model="iconFile"
                            @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
                            :disable="iconFileUploading" outlined bottom-slots class="hidden">
                        </q-file>
                    </q-card-section>
                    <q-card-actions>
                        <q-btn label="Create Token" type="submit" color="primary" class="full-width"
                            @click="onCreateTokenClick" />
                    </q-card-actions>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { MAX_VM_NUMBER } from 'src/core/constants'
import { IdentitySnapshot } from 'src/core/schemas/bcmr-v2.schema'
import { isSquareImage } from 'src/core/utils/is-square-image'
import { uploadFile } from 'src/core/ipfs/upload-file'
import { useWizardConnect } from 'src/composables/useWizardConnect'
import { NFTCapability, Utxo } from 'mainnet-js-v3'
import { shortenTokenId } from 'src/core/utils'
import { UtxoWithPath } from 'src/core/types'
import { stringify } from 'bitauth-libauth-v3'
import { createToken } from 'src/core/transaction'

const $q = useQuasar()
const {
    wzDappMgr,
    wzWallet,
    wzWalletAuthKeyUtxos,
    wzWalletGenesisInputUtxos,
    wzWalletGetUtxos,
    wzGetInputPaths,
    wzWalletResolveUtxosAddressIndex,
} = useWizardConnect()

const typeOptions = ['Fungible', 'Non-Fungible (NFT)', 'Mixed']

const identitySnapshot = ref<IdentitySnapshot>({
    name: '',
    description: '',
    token: {
        category: '',
        symbol: '',
    },
    uris: {
        icon: ''
    }
})

const token = ref({
    amount: '0',
    nft: {
        capability: NFTCapability.minting,
        commitment: ''
    }
})

const tokenType = ref<string>(typeOptions[0]!)

const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const authKeySelected = ref<Utxo>()
const authKeyOptions = computed(() => {
    const options = wzWalletAuthKeyUtxos.value?.map(u => {
        return {
            label: shortenTokenId(u.token!.category as string) + ' [Existing AuthKey]',
            value: u
        }
    })
    if (wzWalletGenesisInputUtxos.value?.length >= 2) {
        // Use the 2nd genesis input for authkey
        options.unshift({
            label: shortenTokenId(wzWalletGenesisInputUtxos.value[1]!.txid) + ' [Generate New]',
            value: wzWalletGenesisInputUtxos.value[1]!
        })
    }
    return options
})
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

const onSubmit = () => {
    // Access form data via form.value

    console.log('Creating CashToken:', token.value)
}

const onGenerateGenesisInput = async () => {
    try {
        if (!wzWallet.value) {
            $q.notify({
                message: 'Wallet Not Initialized'
            })
            return
        }
        const walletUtxos = await wzWalletGetUtxos(wzWallet.value, { excludeTokens: true })
    } catch (error) {
        $q.notify({
            type: 'Error',
            message: `Error: ${error}`
        })
    }
}

const onCreateTokenClick = async () => {
    if (!wzWallet?.value?.utxos || wzWallet.value?.utxos?.length === 0) {
        return $q.notify({
            type: 'Error',
            message: 'Insufficient balance'
        })
    }

    const utxosWithDerivationPaths = wzWalletResolveUtxosAddressIndex(wzWallet.value?.utxos as UtxoWithPath[])
    console.log('utxosWithDerivationPaths', utxosWithDerivationPaths)
    const genesisInput = wzWalletGenesisInputUtxos.value[0]
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

    const sourceOutputs = [
        genesisInput,
        authKeyInput
    ] as UtxoWithPath[]

    const createTokenArgs = {
        genesisInputUtxoId: `${genesisInput.txid}:${genesisInput.vout}` as `${string}:${number}`,
        authKeyUtxoId: `${authKeyInput.txid}:${authKeyInput.vout}` as `${string}:${number}`,
        authKeyRecipientAddress: wzWallet.value.receive?.getTokenDepositAddress(0) as string,
        tokenSpec: { ...token.value, amount: BigInt(token.value.amount) },
        sourceOutputs: sourceOutputs
    }

    try {
        const transaction = createToken(createTokenArgs)
        const inputPaths = wzGetInputPaths(sourceOutputs, wzWallet.value)
        const response = await wzDappMgr.value.signTransaction({
            transaction: {
                transaction,
                sourceOutputs: JSON.parse(stringify(sourceOutputs)),
                userPrompt: "Confirm swap",
                broadcast: true,
            },
            inputPaths
        });

        $q.notify({
            type: 'Success',
            message: `Successfully sent transaction. Tx: ${response.signedTransaction}`
        })
    } catch (error) {
        $q.notify({
            type: 'Error',
            message: 'Error creating transaction: ' + error
        })
    }

}

const initializeDefaultAuthKey = () => {
    authKeySelected.value = authKeyOptions.value?.[0]?.value as Utxo
}


watch(() => iconFile.value, async (v) => {
    if (v) {
        // const squareIcon = await isSquareImage(v)
        const squareIcon = true
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
            identitySnapshot.value.uris!.icon = `/api/ipfs/${uploadResponse.cid}`
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

onMounted(() => {
    console.log('TESTING', wzWallet.value)
})
</script>