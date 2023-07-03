<template>
  <q-card style="width: 80vw;">
    <q-toolbar>
      <!-- <q-avatar>
        <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg">
      </q-avatar> -->
      <q-icon name="token" size="md"></q-icon>
      <q-toolbar-title><span class="text-weight-bold">Token</span> Details</q-toolbar-title>
      <q-btn flat round dense icon="close" v-close-popup />
    </q-toolbar>
    <q-card-section>
      <q-form class="row">
          <div class="col">
            <div class="row q-my-lg">
              <div class="col">
                <q-select color="lime" :filled="true" standout bottom-slots v-model="token.tokenId" :options="tokenIdOptions" label="Token tokenId" clearable>
                  <template v-slot:prepend>
                    <q-icon name="abc" />
                  </template>
                  <template v-slot:hint>
                    Tx id of one of your utxos
                  </template>
                </q-select>
              </div>  
            </div>
            <div class="row q-my-lg">
              <div class="col">
                <q-input color="lime" :filled="true" standout bottom-slots v-model="token.name" label="Token Name" clearable>
                  <template v-slot:prepend>
                    <q-icon name="abc" />
                  </template>
                  <template v-slot:hint>
                    The name of the token
                  </template>
                </q-input>
              </div>  
            </div>
            <div class="row q-my-lg">
              <div class="col">
                <q-input color="lime" :filled="true" v-model="token.maxSupply" label="Max Supply"></q-input>
              </div>  
            </div>
            <div class="row q-my-lg">
              <div class="col">
                <q-input color="lime" :filled="true" v-model="token.symbol" label="Symbol"></q-input>
              </div> 
            </div> 
          </div>
      </q-form>
    </q-card-section>
    <q-card-actions>
      <q-btn @click="emit('confirm', token)">Confirm</q-btn>
      <q-btn @click="emit('cancel')">Cancel</q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue';
import { TokenBcmrBasic } from 'src/interfaces';

defineOptions({name: 'TokenBcmrBasicForm'})

const props = defineProps<{
  tokenIdOptions?: Array<string>,
  tokenId?: string,
  tokenType: 'ft' | 'nft' | 'fnft'
}>()

const emit = defineEmits<{
  confirm: [token: TokenBcmrBasic],
  cancel: []
}>()

const token = ref<TokenBcmrBasic>({
  tokenId: '',
  name: '',
  symbol: '',
  maxSupply: 10,
  bcmrUrl: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
}) 

onMounted(() => {
  if (props.tokenId) {
    token.value.tokenId = props.tokenId
  }
})

</script>
