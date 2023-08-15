<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-md-6 col-lg-6">
        <q-banner class="q-my-sm" rounded>
          <h6>Bitcoin Cash Metadata Registry</h6>
        </q-banner>
        <q-form>
          <q-select class="overflow-hidden ellipsis" :filled="true" bottom-slots v-model="form.selectedToken"
            :options="form.tokenSelections" label="Select authbase (Token Id)"
            :loading="Boolean(AuthchainIdentity.processing)" dense square new-value-mode="add" use-input
            @new-value="(v: any, vv) => console.log(v, vv)">
            <template v-slot:loading>
              <q-spinner-facebook size="sm" color="primary" />
            </template>
          </q-select>
        </q-form>
        <BitcoinCashMetadataRegistry v-if="authchainIdentity" :authchain-identity="authchainIdentity"
          :instance="registry" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { onMounted, ref, watch } from 'vue';
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { useUser } from 'src/stores/user';
import { Wallet } from 'mainnet-js';
import shortenTokenId from 'src/utils/shortenTokenId';
import BitcoinCashMetadataRegistry from 'src/components/BitcoinCashMetadataRegistry.vue'
import { BitcoinCashMetadataRegistry as BitcoinCashMetadataRegistryModel } from 'src/models/BitcoinCashMetadataRegistry'

const user = useUser()
const authchainIdentities = ref<AuthchainIdentity[]>()
const authchainIdentity = ref<AuthchainIdentity>()
const registry = ref<BitcoinCashMetadataRegistryModel>()
const form = ref<{
  selectedToken: { value: string, label: string },
  tokenSelections: { value: string, label: string }[]
}>({
  selectedToken: { value: '', label: '' },
  tokenSelections: []
})

watch(() => form.value.selectedToken, (selected) => {
  if (selected) {
    authchainIdentity.value = authchainIdentities.value?.find((ai) => ai.token?.tokenId === selected.value)
    registry.value = new BitcoinCashMetadataRegistryModel({
      registryIdentity: authchainIdentity.value!.token!.tokenId,
      latestRevision: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 }
    })
  }
})

onMounted(async () => {
  if (user.wallet) {
    if (user.authchainIdentities) {
      authchainIdentities.value = user.authchainIdentities as AuthchainIdentity[]
      form.value.tokenSelections
        = authchainIdentities.value?.map((ai) => ({ value: ai.token!.tokenId, label: shortenTokenId(ai.token!.tokenId) })) || []
      // form.value.selectedToken = form.value.tokenSelections[0]
    }
    user.authchainIdentities = (await AuthchainIdentity.scanWalletForAuthchainIdentities(user.wallet as Wallet))
    authchainIdentities.value = user.authchainIdentities as AuthchainIdentity[]
    form.value.tokenSelections
      = authchainIdentities.value?.map((ai) => ({ value: ai.token!.tokenId, label: shortenTokenId(ai.token!.tokenId) })) || []
    // form.value.selectedToken = form.value.tokenSelections[0]
  }

})
</script>

