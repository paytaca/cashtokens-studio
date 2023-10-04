<template>
    <q-page class="q-ma-lg">
        <div class="row justify-center q-mx-sm">
            <div class="col-xs-12 col-md-10">
                <h5 class="text-center">My Collectibles(NFTs)</h5>
                <div class="q-pa-lg flex flex-center">
                    <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
                        :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
                </div>
                <div class="text-right q-my-sm">
                    <q-checkbox v-model="excludePossibleAuthKeys" label="Exclude Possible AuthKeys" class="text-grey-6"
                        dense>
                        <q-tooltip>
                            Excludes NFT that could be possibly an AuthKey so you don't accidentally send it to someone.
                        </q-tooltip>
                    </q-checkbox>
                </div>
                <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
                    <q-markup-table>
                        <thead>
                            <tr v-if="watchtower.processing">
                                <th colspan="6">
                                    <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
                                </th>
                            </tr>
                            <tr>
                                <th>#</th>
                                <th>Brand</th>
                                <th>Symbol</th>
                                <th>Token Id</th>
                                <th>Capability</th>
                                <th>
                                    <sup>
                                        <q-icon name="info" size="xs">
                                            <q-tooltip>
                                                If the token is a minting token. Value would be the commitment of the last
                                                minted
                                                child. Value shown here are the decimal format of value on-chain.
                                            </q-tooltip>
                                        </q-icon>
                                    </sup>
                                    Commitment
                                    <q-btn-toggle v-model="commitmentFormat" push toggle-color="teal" :options="[
                                        { label: '0x', value: 'hex' },
                                        { label: '123', value: 'decimal' },
                                    ]" size="sm" dense no-caps />
                                </th>
                                <!-- <th>Action</th> -->
                            </tr>
                        </thead>
                        <TableBodySkeleton v-if="watchtower.processing && !nftCollections" :col-count="4" :row-count="3"
                            :caption="watchtower.processing" />
                        <tbody v-else class="text-center">

                            <tr v-for="b, i in nftCollections" :key="'ai-rec-' + i">
                                <td>{{ i + pagination.offset + 1 }}</td>
                                <td>
                                    <q-avatar v-if="b.tokenUris?.icon">
                                        <img :src="b.tokenUris?.icon" alt="na">
                                    </q-avatar>
                                    <q-icon v-else name="token" size="xl" color="disabled" />
                                </td>
                                <td>
                                    <q-spinner v-if="b.processing === 'Checking token registry'"></q-spinner>
                                    <div v-else>
                                        <q-chip v-if="b.tokenCategory?.symbol" color="primary" class="q-p-sm" square
                                            outline>
                                            {{ b.tokenCategory?.symbol }}
                                        </q-chip>
                                        <span v-else>---</span>
                                    </div>
                                </td>
                                <td>
                                    <TokenCategory :tokenId="b.token?.tokenId" />
                                </td>

                                <td>{{ b.token?.capability }}</td>
                                <!-- <td>{{ b.token?.commitment }}</td> -->
                                <!-- <td>{{ b.token?.commitment ? binToBigIntUintLE(hexToBin(b.token.commitment)) : '---' }}</td> -->
                                <td>

                                    <!-- {{ identity.token?.commitment ? binToBigIntUintLE(hexToBin(identity.token.commitment)) : '---' }} -->
                                    <!-- {{ identity.token?.commitment ? binToBigIntUintLE(hexToBin(identity.token.commitment)) : '---' }} -->
                                    {{ b.token?.commitment !== undefined ? commitmentDisplay(b.token?.commitment) : '---' }}
                                    <!-- {{ b.token?.commitment }} -->
                                </td>
                                <!-- <td>
                                    <q-btn color="primary" dense no-caps @click="openDialog(TokenSenderDialog.__name, b)">Send</q-btn>
                                </td> -->
                            </tr>
                            <tr v-if="nftCollections.length === 0 && !watchtower.processing">
                                <td colspan="6">
                                    No data
                                </td>
                            </tr>
                            <tr v-if="watchtower.processing">
                                <td colspan="6">
                                    <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
                                </td>
                            </tr>
                        </tbody>
                    </q-markup-table>
                    <!-- <TokenSenderDialog :model-value="dialog === TokenSenderDialog.__name" :token-balance="dialogData" /> -->
                </q-scroll-area>
            </div>
        </div>
    </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { CashToken, PartialBcmr, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import { PaginatedData } from 'src/app/types';
import { binToBigIntUintLE, binToBigIntUint64LE, binToNumberInt32LE, binToNumberUint16LE, hexToBin } from '@bitauth/libauth';
import { FetchUtxoQueryParams } from 'src/app/Watchtower'
defineOptions({ name: 'NonFungibleTokens' })
const user = useUser()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
const nftCollections = ref<CashToken[]>([])
const paginatedNftCollections = ref<PaginatedData>()

const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
    numberOfPages: 0,
    currentPage: 0,
    maxRowsPerPage: 0,
    rowCount: 0,
    offset: 0,
})

const commitmentFormat = ref<'hex' | 'decimal'>('decimal')
const watchtower = ref<Watchtower>(new Watchtower())
const excludePossibleAuthKeys = ref<boolean>(true)
const commitmentDisplay = computed(() => {
    return (commitment: string | undefined) => {
        if (commitment && commitmentFormat.value === 'decimal') {
            return binToBigIntUintLE(hexToBin(commitment))
        }
        return commitment
    }
})


const populateNftCollections = (paginated: PaginatedData) => {
    // populate 
    nftCollections.value = []
    const results = paginated.results
    for (let i = 0; i < results.length; i++) {
        const {
            txid,
            vout,
            satoshis,
            height,
            coinbase,
            token
        } = results[i]

        nftCollections.value.push(new CashToken({
            txid,
            vout,
            satoshis,
            height,
            coinbase,
            token
        }))
    }

    nftCollections.value.forEach(async (a) => {
        await a.resolveTokenCategory()
        await a.resolveTokenUris()
    })
}

watch(() => pagination.value.currentPage, async (pageNumber, oldPageNumber) => {
    if (user.wallet) {
        if (pageNumber === 1) {
            pagination.value.offset = 0
        } else {
            if (oldPageNumber > pageNumber) {
                pagination.value.offset -= pagination.value.maxRowsPerPage
            } else {
                pagination.value.offset += pagination.value.maxRowsPerPage
            }

        }
        let query: FetchUtxoQueryParams = { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
        if (excludePossibleAuthKeys.value) {
            query.commitment_ne = '00'
            console.log('excluding', query)
        }

        paginatedNftCollections.value = await watchtower.value.fetchNfts(
            user.wallet.getTokenDepositAddress(), query
        )
        populateNftCollections(paginatedNftCollections.value)
        user.paginatedNftCollections = paginatedNftCollections.value
    }
})

watch(() => excludePossibleAuthKeys.value, async (v) => {
    console.log(v)
    refreshData()
    initPagination()
})

const initPagination = () => {
    if (paginatedNftCollections.value && paginatedNftCollections.value?.count > 0) {
        pagination.value.currentPage = Math.ceil((paginatedNftCollections.value.offset + 1) / paginatedNftCollections.value.limit)
        pagination.value.maxRowsPerPage = paginatedNftCollections.value.limit
        pagination.value.rowCount = paginatedNftCollections.value.count
        pagination.value.numberOfPages = Math.ceil(paginatedNftCollections.value.count / paginatedNftCollections.value.limit)
        pagination.value.offset = paginatedNftCollections.value.offset
    }
}

const refreshData = async () => {
    if (user.wallet) {
        let query: FetchUtxoQueryParams = { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
        if (excludePossibleAuthKeys.value) {
            query.commitment_ne = '00'
            console.log('excluding', query)
        }
        paginatedNftCollections.value = await watchtower.value.fetchNfts(
            user.wallet.getTokenDepositAddress(),
            query
        )
        user.paginatedNftCollections = paginatedNftCollections.value
        console.log('DATA', paginatedNftCollections.value)
        populateNftCollections(paginatedNftCollections.value)
        initPagination()
    }
}


onMounted(async () => {
    if (user.wallet) {
        if (user.paginatedNftCollections) {
            paginatedNftCollections.value = user.paginatedNftCollections
            populateNftCollections(paginatedNftCollections.value)
        }
        refreshData()
    }
})
</script>