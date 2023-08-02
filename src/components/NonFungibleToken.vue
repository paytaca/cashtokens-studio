<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title>Create Token</q-toolbar-title>
    </q-toolbar>
    <q-input :model-value="owner" label="Owner" :filled="true" disable dense square />
    <q-select v-if="action === 'genesis'" class="overflow-hidden ellipsis" :filled="true" bottom-slots
      v-model="tokenIdSelected" :options="tokenIdOptions" label="Token ID" dense square hide-bottom-space
      @update:model-value="tokenIdSelectedChanged">
      <template v-slot:loading>
        <q-spinner-facebook size="sm" color="primary" />
      </template>
    </q-select>
    <q-input v-else v-model="token.tokenId" label="Token ID" :filled="true" dense square />
    <template v-if="token.tokenId">
      <q-input v-model="token.capability" label="Capability" :filled="true" dense square />
      <q-input v-model="token.commitment" label="Commitment" :filled="true" dense square />
      <div class="row items-center">
        <q-checkbox :filled="true" dark:color="lime" v-model="publishRegistry" size="xs" label="Publish BCMR">
        </q-checkbox>
        <q-btn size="xs" color="info" icon="help" flat round>
          <q-tooltip>Include a BCMR publication output</q-tooltip>
        </q-btn>
      </div>
      <template v-if="publishRegistry">
        <div v-if="token.registry" class="row q-pa-sm"
          style="border-style: solid; border-width: 1px; border-radius: 5px;">
          <q-input class="col-12 q-mt-sm" :filled="true" v-model="token.registry.url" type="url"
            :rules="[v => v.length > 7 || 'Invalid URL']" label="The BCMR's URL" dense square standout
            hide-bottom-space></q-input>
          <div class="col-12 row items-top q-col-gutter-none q-my-md">
            <div class="col-xs-12">
              <q-input :filled="true" v-model="token.registry.contentHash" :loading="isLoadingRegistry" type="url"
                label="The BCMR's content hash" dense square>
                <template v-slot:loading>
                  <q-spinner-facebook color="primary" />
                </template>
              </q-input>
            </div>
            <div v-if="token.registry.url" class="col-xs-12">
              <q-btn color="primary" size="sm" icon="cloud_download" label="Download content and load hash" no-caps flat
                dense @click="loadRegistryHashFromUrl"></q-btn>
            </div>
          </div>
        </div>
      </template>
      <div class="row justify-end q-my-lg">
        <q-btn v-if="action === 'genesis'" @click="token.createGenesis()">Create Token</q-btn>
      </div>
    </template>
  </q-form>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { watch, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { TokenAction } from 'src/types'
import NonFungibleTokenModel from 'src/models/NonFungibleToken'
import fetchBcmrContentHash from 'src/bcmr/fetchBcmrContentHash';
import { useUser } from 'src/stores/user'
import { NFTCapability } from 'mainnet-js'
defineOptions({ name: 'NonFungibleToken' })
const $q = useQuasar()
const user = useUser()
const props = defineProps<{ owner?: string, action?: TokenAction, genesisTokenIdOptions?: string[] }>()
const token = ref<NonFungibleTokenModel>(new NonFungibleTokenModel({
  tokenId: props.genesisTokenIdOptions && props.genesisTokenIdOptions[0] || '',
  capability: NFTCapability.minting,
  commitment: ''
}))

const tokenIdOptions = ref<{ value: string, label: string }[]>()
const tokenIdSelected = ref<{ value: string, label: string }>()

const publishRegistry = ref<boolean>(false)
const isLoadingRegistry = ref<boolean>()

watch(() => publishRegistry.value, (yes) => {
  if (yes) {
    token.value.registry = { url: '', contentHash: '' }
  } else {
    delete token.value.registry
  }
})
onMounted(() => {
  if (props.action === 'genesis') {
    tokenIdOptions.value = props.genesisTokenIdOptions?.map(txid => ({ value: txid, label: txid.replace(txid.substring(8, 48), '...') }))
  }
  token.value.ownerWallet = user.wallet
})

const tokenIdSelectedChanged = (p: { value: string, label: string }) => {
  token.value.tokenId = p.value
}

const loadRegistryHashFromUrl = () => {
  isLoadingRegistry.value = true
  if (token.value.registry?.contentHash) {
    const endNotif = $q.notify({ spinner: true, message: 'Checking hash of URL\'s content', type: 'info' })
    fetchBcmrContentHash(token.value.registry.url)
      .then((v) => {
        if (token.value.registry) {
          token.value.registry.contentHash = v || ''
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        endNotif()
        isLoadingRegistry.value = false
      })
  }

}



</script>
