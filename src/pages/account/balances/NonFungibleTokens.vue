<template>
    <q-page class="q-ma-lg">
        <div class="row justify-center q-mx-sm">
            <div class="col-xs-12 col-md-10">
                <h5 class="text-center">My Collectibles(NFTs)</h5>
                <div class="q-pa-lg flex flex-center">
                    <q-pagination v-model="pagination.currentPage" :max="pagination.numberOfPages"
                        :max-pages="pagination.maxRowsPerPage" :boundary-numbers="false" />
                </div>
                <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
                    <q-markup-table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Brand</th>
                                <th>Symbol</th>
                                <th>Token Id</th>
                                <th>Capability</th>
                                <th>Commitment</th>
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
                                <td>{{ b.token?.commitment }}</td>
                                <!-- <td>
                                    <q-btn color="primary" dense no-caps @click="openDialog(TokenSenderDialog.__name, b)">Send</q-btn>
                                </td> -->
                            </tr>
                            <tr v-if="nftCollections.length === 0 && !watchtower.processing">
                                <td colspan="4">
                                    No data
                                </td>
                            </tr>
                            <tr v-if="watchtower.processing">
                                <td colspan="4">
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
import { onMounted, ref, watch } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { CashToken, PartialBcmr, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import { PaginatedData } from 'src/app/types';

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

const watchtower = ref<Watchtower>(new Watchtower())

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
        paginatedNftCollections.value = await watchtower.value.fetchNfts(
            user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
        )
        populateNftCollections(paginatedNftCollections.value)
        user.paginatedNftCollections = paginatedNftCollections.value
    }
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
        paginatedNftCollections.value = await watchtower.value.fetchNfts(
            user.wallet.getTokenDepositAddress(),
            { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
        )
        user.paginatedNftCollections = paginatedNftCollections.value
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