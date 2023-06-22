<template>
  <q-page class="row justify-evenly">
    <div class="col-8">
      <div class="row q-my-lg">
        <div class="col">Create New Fungible Token {{ env }}</div>
      </div>
      <q-form class="row">
        <div class="col">
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.name" label="Token name"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.maxSupply" label="Max Supply"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.bcmrUrl" label="BCMR Url"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-btn color="primary">Create Token Genesis</q-btn>
            </div>  
          </div>
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script lang="ts">

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FtCreate',
  setup () {
    const env = process.env.APP_ENV
    console.log(process.env)
    const fungibleToken = {
      name: '',
      maxSupply : '',
      bcmrUrl: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
    }
    return { fungibleToken, env };
  },
  methods: {
    async createTokenGenesis() {
      console.log('CREATING TOKEN GENESIS')
    }
  }
});
</script>
