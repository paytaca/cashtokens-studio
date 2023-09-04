<template>
    <q-page class="q-ma-lg">
        <div class="row justify-center q-mx-sm">
            <div class="col-xs-12 col-md-10">
                <h5 class="text-center">My Collectibles(NFTs)</h5>
                <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
                    <q-markup-table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Token Id</th>
                                <th>Capability</th>
                                <th>Commitment</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <TableBodySkeleton v-if="loading" :col-count="5" :row-count="3" :caption="loading" />
                        <tbody v-else class="text-center">
                            <tr v-for="b, i in collectibles" :key="'ai-rec-' + i">
                                <td>{{ i + 1 }}</td>
                                <td>
                                    <TokenCategory :tokenId="b.tokenId" />
                                </td>
                                <td>{{ b.capability }}</td>
                                <td>{{ b.commitment }}</td>
                                <td>
                                    <!-- <q-btn color="primary" dense no-caps @click="openDialog(TokenSenderDialog.__name, b)">Send</q-btn> -->
                                </td>
                            </tr>
                            <tr v-if="collectibles.length === 0 && !CashToken.processing">
                                <td colspan="5">
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
import { onMounted, ref } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { CashToken } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue'
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue'

defineOptions({ name: 'NonFungibleTokens' })
const user = useUser()
const { dialog, dialogData, openDialog, onHide } = useDialogs()
const collectibles = ref<{ tokenId: string, capability: NFTCapability, commitment: string }[]>([])
const loading = ref<string>('')
onMounted(async () => {
    if (user.wallet) {
        loading.value = 'Scanning wallet for fungible tokens'
        collectibles.value = (await user.wallet.getAddressUtxos())
            .filter((u: UtxoI) => u.token?.capability && !u.token?.amount)
            .map((u: UtxoI) => (
                { tokenId: u.token?.tokenId, capability: u.token?.capability, commitment: u.token?.commitment } as { tokenId: string, capability: NFTCapability, commitment: string }
            ))

        loading.value = ''

    }
})

</script>