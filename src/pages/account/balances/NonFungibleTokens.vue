<template>
    <q-page class="q-ma-sm">
        <div class="row justify-center">
            <div class="col-xs-12 col-md-10">
                <h5 class="text-center">
                    <q-icon name="perm_media" class="q-mx-sm"></q-icon>My Collectibles (NFTs)
                    <q-badge color="warning" text-color="black" align="top" rounded>
                        {{ nftCollections?.count || 0 }}
                    </q-badge>
                </h5>
                <div>
                    <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered grid
                        title="My Collections" :rows="nftCollections.results" :columns="[
                            {
                                name: 'name', label: 'Name',
                                field: r => r.nftType?._meta?.commitment ? r.nftType[r.nftType._meta.commitment]?.name : '---',
                            },
                            {
                                name: 'commitment', label: 'Commitment',
                                field: r => r.nftType?._meta?.commitment ? r.nftType._meta.commitment : '---',
                            }
                        ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" hide-header>
                        <template v-slot:top>
                            <div class="col-12 text-right q-my-sm">
                                <q-checkbox v-model="excludePossibleAuthKeys" label="Exclude Possible AuthKeys"
                                    class="text-grey-6" dense>
                                    <q-tooltip>
                                        Excludes NFT that could be possibly an AuthKey so you don't accidentally send it to
                                        someone.
                                    </q-tooltip>
                                </q-checkbox>
                            </div>
                        </template>
                        <template v-slot:item="i">
                            <q-card class="my-card q-ma-sm text-center col-grow"
                                style="border-radius: 15px; max-width:200px">
                                <q-img v-if="i.row.nftTypeMetadata?.uris?.icon" style="height: 170px; min-width: 170px;"
                                    fit="fill"
                                    :src="i.row.nftTypeMetadata?.uris?.icon ? (i.row.nftTypeMetadata.uris?.icon.startsWith('ipfs://') ? ipfsToGatewayUrl(i.row.nftTypeMetadata.uris.icon) : i.row.nftTypeMetadata.uris.icon) : ''"
                                    alt="na">
                                    <div class="absolute-bottom text-left">
                                        <div class="text-subtitle1">
                                            {{
                                                i.row.token?.commitment ? (i.row.nftCollectionType ==
                                                    'SequentialNftCollection' ? '#' + formatCommitment(i.row.token.commitment,
                                                        'vm-number',
                                                        'decimal') : i.row.token.commitment) : ''
                                            }}
                                        </div>
                                    </div>
                                </q-img>
                                <q-icon v-else name="token" size="170px" color="grey"></q-icon>
                                <div class="q-px-sm text-left">
                                    <code class="text-caption">{{ `<${i.row.token.commitment}>` }}</code>
                                    <div v-if="i.row.nftTypeMetadata?.name" class="ellipsis">
                                        {{ i.row.nftTypeMetadata?.name }}
                                    </div>
                                    <div v-else-if="i.row.token?.commitment" class="ellipsis">
                                        <code class="text-caption">{{ `<${shortenTokenId(i.row.token.tokenId)}>` }}</code>
                                    </div>

                                </div>
                                <q-card-actions align="right">
                                    <q-btn dense no-caps icon="send" size="lg" text-color="primary"
                                        :disable="!!isTokenTransferred(i.row.utxo)"
                                        @click="() => openNFTTransferDialog(i.row as CashToken)">
                                    </q-btn>
                                </q-card-actions>
                                <q-inner-loading :showing="!!isTokenTransferred(i.row.utxo)" label="Test">
                                    <span class="text-bold text-negative q-px-sm rounded-borders">Sent</span>
                                    <q-spinner-gears class="hidden"></q-spinner-gears>
                                </q-inner-loading>
                            </q-card>
                        </template>
                    </q-table>
                </div>
            </div>
        </div>
        <NFTOwnershipTransferDialog :model-value="dialog === NFTOwnershipTransferDialog.__name" :nft="dialogData"
            @hide="onHide" @nft-transferred="() => onNftTransfer()" />
    </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, CashToken, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { FetchUtxoQueryParams } from 'src/app/Watchtower'
import NFTOwnershipTransferDialog from 'src/components/dialogs/NFTOwnershipTransferDialog.vue'
import { UtxoI, Wallet } from 'mainnet-js';
import { formatCommitment, ipfsToGatewayUrl, shortenTokenId } from 'src/app/utils';
import { EventBus, useQuasar } from 'quasar';
defineOptions({ name: 'NonFungibleTokens' })
const $q = useQuasar()
const user = useUser()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()

const nftCollections = ref<PaginatedData>({
    count: 0,
    limit: 0,
    offset: 0,
    next: null,
    previous: null,
    results: []
})

const pagination = ref({
    sortBy: 'desc',
    descending: false,
    page: 1,
    rowsPerPage: 12,
    rowsNumber: 12
})

const rowsPerPageOptions = computed(() => {
    return [12, 24, 36]
})

const excludePossibleAuthKeys = ref<boolean>(true)

const transferredTokens = ref<UtxoI[]>()
const isTokenTransferred = computed(() => {
    return (utxo: UtxoI) => {
        const trans = transferredTokens.value?.find((u: UtxoI) => (
            Boolean(utxo.txid == u.txid && utxo.token?.commitment == u.token?.commitment && utxo.token?.tokenId == u.token?.tokenId)
        ))
        return trans
    }
})

const openNFTTransferDialog = (nft: CashToken) => {
    nft.ownerWallet = user.wallet as Wallet // embedding wallet
    nft.processing = ''
    openDialog(NFTOwnershipTransferDialog.__name, nft)
}

const onNftTransfer = () => {
    if (!transferredTokens.value) {
        transferredTokens.value = []
    }
    transferredTokens.value.push(Object.assign({}, dialogData.value?.utxo))
    hideDialog()
}

watch(() => pagination.value, () => {
    transferredTokens.value = []
})

watch(() => excludePossibleAuthKeys.value, async (v) => {
    await populateNftCollections(user.wallet as Wallet, user.transactionSigner!, excludePossibleAuthKeys.value)
    transferredTokens.value = []
})

const populateNftCollections = async (wallet: Wallet, transactionSigner: TransactionSigner, excludePossibleAuthKeys?: boolean) => {
    if (wallet) {
        const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
        if (excludePossibleAuthKeys) {
            query.commitment_ne = '00'
        }
        $q.loading.show()
        const resp = await (new Watchtower()).fetchNfts(
            wallet.getTokenDepositAddress(),
            query
        )
        $q.loading.hide()

        if (resp?.count > 0) {
            nftCollections.value = resp
            pagination.value.rowsNumber = resp.count
            nftCollections.value.results?.forEach(async (cashtoken, i) => {
                const authKeyUtxoClone = Object.assign({}, cashtoken.authKey)
                const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
                const {
                    txid,
                    vout,
                    satoshis,
                    height,
                    coinbase,
                    token
                } = cashtoken
                nftCollections.value.results[i] = new CashToken({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)
                await nftCollections.value.results[i].resolveNftType()
            })

        }

    }
}

onBeforeMount(async () => {
    if (user.wallet) {
        await populateNftCollections(user.wallet as Wallet, user.transactionSigner!, excludePossibleAuthKeys.value)
    }

})

const onTableRequest = async (props: any) => {
    pagination.value = props.pagination
    await populateNftCollections(user.wallet as Wallet, user.transactionSigner!, excludePossibleAuthKeys.value)
}

onMounted(async () => {
    transferredTokens.value = []
    eventBus?.on(ADDRESS_WATCHER_TRIGGERED, () => {
        // refreshData()
    })
})

onBeforeUnmount(() => {
    eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>