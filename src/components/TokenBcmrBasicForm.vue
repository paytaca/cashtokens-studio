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
              <q-select color="lime" :filled="true" standout bottom-slots v-model="registry.tokenId"
                :options="tokenIdOptions" label="Schema Version" clearable>
                <q-option>https://cashtokens.org/bcmr-v2.schema.json</q-option>
              </q-select>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-select color="lime" :filled="true" standout bottom-slots v-model="registry.tokenId"
                :options="tokenIdOptions" label="Token tokenId" clearable>
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
              <q-input color="lime" :filled="true" standout bottom-slots v-model="registry.name" label="Token Name"
                clearable>
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
              <q-input color="lime" :filled="true" standout bottom-slots v-model="registry.name" label="Token Description"
                clearable>
                <template v-slot:prepend>
                  <q-icon name="abc" />
                </template>
              </q-input>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input color="lime" :filled="true" standout bottom-slots v-model="registry.name" label="Symbol" clearable>
                <template v-slot:prepend>
                  <q-icon name="abc" />
                </template>
              </q-input>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input color="lime" :filled="true" standout bottom-slots v-model="registry.name" label="Icon" clearable>
                <template v-slot:prepend>
                  <q-icon name="link" />
                </template>
              </q-input>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input color="lime" :filled="true" standout bottom-slots v-model="registry.name" label="Decimals"
                clearable>
                <template v-slot:prepend>
                  <q-icon name="number" />
                </template>
              </q-input>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input color="lime" :filled="true" v-model="registry.maxSupply" label="Max Supply"></q-input>
            </div>
          </div>
        </div>
      </q-form>
    </q-card-section>
    <q-card-actions>
      <q-btn @click="emit('confirm', registry)">Confirm</q-btn>
      <q-btn @click="emit('cancel')">Cancel</q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue';
defineOptions({ name: 'TokenBcmrBasicForm' })

const props = defineProps<{
  tokenIdOptions?: Array<string>,
  tokenId?: string,
  tokenType: 'ft' | 'nft' | 'fnft'
}>()

const emit = defineEmits<{
  confirm: [token: BcmrBasic],
  cancel: []
}>()

const registry = ref({
  tokenId: '',
  name: '',
  description: '',
  decimals: 8,
  symbol: '',
  maxSupply: 1e8,
  icon: 'https://example.com/icons/registry.png',
  bcmrUrl: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
})

onMounted(() => {
  if (props.tokenId) {
    registry.value.tokenId = props.tokenId
  }
})

</script>
