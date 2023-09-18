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
                                <th>Token Id</th>
                                <th>Capability</th>
                                <th>Commitment</th>
                                <!-- <th>Action</th> -->
                            </tr>
                        </thead>
                        <TableBodySkeleton v-if="watchtower.processing" :col-count="4" :row-count="3"
                            :caption="watchtower.processing" />
                        <tbody v-else class="text-center">
                            <tr v-for="b, i in collectibles" :key="'ai-rec-' + i">
                                <td>{{ i + pagination.offset + 1 }}</td>
                                <td>
                                    <TokenCategory :tokenId="b.token?.tokenId" />
                                </td>
                                <td>{{ b.token?.capability }}</td>
                                <td>{{ b.token?.commitment }}</td>
                                <!-- <td>
                                    <q-btn color="primary" dense no-caps @click="openDialog(TokenSenderDialog.__name, b)">Send</q-btn>
                                </td> -->
                            </tr>
                            <tr v-if="collectibles.length === 0 && !watchtower.processing">
                                <td colspan="4">
                                    No data
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
import { NFTCapability, UtxoI } from 'mainnet-js'
import { onMounted, ref, watch } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { CashToken, Watchtower } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'
import { PaginatedData } from 'src/app/types';

defineOptions({ name: 'NonFungibleTokens' })
const user = useUser()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
// const collectibles = ref<{ tokenId: string, capability: NFTCapability, commitment: string }[]>([])
const collectibles = ref<CashToken[]>([])
const paginatedCollectibles = ref<PaginatedData>()

const pagination = ref<{ numberOfPages: number, currentPage: number, maxRowsPerPage: number, rowCount: number, offset: number }>({
    numberOfPages: 0,
    currentPage: 0,
    maxRowsPerPage: 0,
    rowCount: 0,
    offset: 0,
})

const watchtower = ref<Watchtower>(new Watchtower())

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
        paginatedCollectibles.value = await watchtower.value.fetchNfts(
            user.wallet.getTokenDepositAddress(), { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
        )

        console.log('FUNGIBLE TOKENS', paginatedCollectibles.value)
        // populate 
        collectibles.value = []
        const results = paginatedCollectibles.value.results
        for (let i = 0; i < results.length; i++) {
            const {
                txid,
                vout,
                satoshis,
                height,
                coinbase,
                token
            } = results[i]

            collectibles.value.push(new CashToken({
                txid,
                vout,
                satoshis,
                height,
                coinbase,
                token
            }))
        }
    }
})

const initPagination = () => {
    if (paginatedCollectibles.value && paginatedCollectibles.value?.count > 0) {
        pagination.value.currentPage = Math.ceil((paginatedCollectibles.value.offset + 1) / paginatedCollectibles.value.limit)
        pagination.value.maxRowsPerPage = paginatedCollectibles.value.limit
        pagination.value.rowCount = paginatedCollectibles.value.count
        pagination.value.numberOfPages = Math.ceil(paginatedCollectibles.value.count / paginatedCollectibles.value.limit)
        pagination.value.offset = paginatedCollectibles.value.offset
    }
}
onMounted(async () => {
    if (user.wallet) {
        paginatedCollectibles.value = await watchtower.value.fetchNfts(
            user.wallet.getTokenDepositAddress(),
            { limit: pagination.value.maxRowsPerPage, offset: pagination.value.offset }
        )
        initPagination()
        // collectibles.value = (await user.wallet.getAddressUtxos())
        //     .filter((u: UtxoI) => u.token?.capability && !u.token?.amount)
        //     .map((u: UtxoI) => (
        //         { tokenId: u.token?.tokenId, capability: u.token?.capability, commitment: u.token?.commitment } as { tokenId: string, capability: NFTCapability, commitment: string }
        //     ))

    }
})

</script>