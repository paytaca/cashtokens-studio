<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Locked Token Identities</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <!-- <q-scroll-area style="position:relative; height:fit-content; max-width: 100vw;" :bar-style="{ width: '0px' }"> -->
        <q-markup-table flat class="q-my-md">
          <tbody class="text-left">
            <tr class="text-left">
              <td>AuthKey NFT token id</td>
              <td>
                <TokenCategory :token-id="authKey.token?.tokenId" icon-right="key" />
              </td>
            </tr>
            <tr class="text-left">
              <td>AuthGuard Address</td>
              <td>
                <CashAddress :cashaddr="authGuard?.contract?.getTokenDepositAddress()" icon-right="lock" />
              </td>
            </tr>
          </tbody>
        </q-markup-table>
        <q-markup-table v-if="lockedIdentityOutputs.length > 0" flat bordered separator="cell" class="q-my-md">
          <thead class="text-left">
            <tr>
              <th>#</th>
              <th>Brand</th>
              <th>Symbol</th>
              <th>Token Id</th>
            </tr>
          </thead>
          <tbody class="text-left">
            <tr v-for="lockedIdentityOutput, i in lockedIdentityOutputs" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <q-skeleton v-if="lockedIdentityOutput?.processing" type="circle"></q-skeleton>
                <template v-else>
                  <q-avatar v-if="lockedIdentityOutput.identitySnapshot?.uris?.icon">
                    <img :src="ipfsToGatewayUrl(lockedIdentityOutput.identitySnapshot?.uris?.icon)" alt="na">
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="disabled" />
                </template>
              </td>
              <td>
                <q-skeleton v-if="lockedIdentityOutput?.processing" bordered square></q-skeleton>
                <span v-else>{{ lockedIdentityOutput.identitySnapshot?.token?.symbol }}</span>
              </td>
              <td>
                <TokenCategory :token-id="lockedIdentityOutput.token?.tokenId" />
              </td>
            </tr>
          </tbody>
        </q-markup-table>
        <div v-else class="row justify-center q-my-md">No Locked Tokens</div>
        <!-- </q-scroll-area> -->
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn size="lg" v-close-popup label="Ok" color="primary" />
      </q-card-actions>
    </q-card>

  </q-dialog>
</template>
<script setup lang="ts">
import { UtxoI } from 'mainnet-js';
import { AuthGuard, AuthKey, CashToken } from 'src/apps';
import { ref, onMounted } from 'vue';
import TokenCategory from 'src/components/TokenCategory.vue'
import CashAddress from '../CashAddress.vue';
import { ipfsToGatewayUrl } from 'src/apps/utils';
import { useMetadataStore } from 'src/stores/metadata';
const props = defineProps<{ authGuard: AuthGuard, authKey: AuthKey }>()
const lockedIdentityOutputs = ref<CashToken[]>([])
const lockedTokens = ref<UtxoI[]>([])
const metadataStore = useMetadataStore()

onMounted(async () => {
  if (props.authGuard) {
    try {
      console.log('AUTHGUARD', props.authGuard)
      lockedTokens.value = await props.authGuard.getLockedTokenIdentities()
      console.log(lockedTokens.value)
      lockedTokens.value.forEach((u: UtxoI) => {
        lockedIdentityOutputs.value.push(new CashToken({ ...u }))
      })
      lockedIdentityOutputs.value.forEach(async (a) => {
        if (!a.token?.tokenId) return;
        a.processing = 'Resolving token category'
        a.identitySnapshot = await metadataStore.resolveIdentitySnapshot(a.token.tokenId)
        a.processing = ''
      })
    } catch (error) {
      console.log(error)
    }
  }
})
</script>