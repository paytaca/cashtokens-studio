<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-end">
          <q-btn to="/issuer/tokens/create/ft">FT</q-btn>
          <q-btn to="/issuer/tokens/create/nft">NFT</q-btn>
        </div>
        <div class="row justify-center q-my-lg">
          <template v-if="!genesisInput || !authKey">
            <q-banner :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'" rounded>
              <template v-slot:avatar>
                <q-icon name="warning" color="warning" size="xs" />
              </template>
              Your wallet has {{ user.genesisInputs?.length || 0 }} vout-0 utxo.
              Cashtoken Studio requires 2 vout-0
              utxos as genesis inputs when creating a token.
              <template v-slot:action>
                <BusyButton :busy-label="GenesisInput.processing" label="Generate genesis input"
                  @click="generateGenesisInputs" color="primary" />
              </template>
            </q-banner>
          </template>
          <template v-else>
            <TokenGenesisForm
              :token-type="(route.params.tokenType as ('ft'|'nft'|'fnft'))"
              :genesis-input="genesisInput"
              :auth-key="authKey"
              :owner-wallet="(user.wallet! as Wallet)"
              :create-auth-key="true"
              />
          </template>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { UtxoI, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { GenesisInput, AuthKey } from 'src/app'
import TokenGenesisForm from 'src/components/forms/TokenGenesisForm.vue'

const $q = useQuasar()
const user = useUser()
const route = useRoute()
const authKey = ref<AuthKey>()
const genesisInput = ref<UtxoI>()

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 2) {
    // use first for AuthKey
    genesisInput.value = value[0]
    authKey.value = new AuthKey({...value[1]})
  }
})

onMounted(async () => {
  if (user.genesisInputs && user.genesisInputs?.length >= 2) {
    genesisInput.value = user.genesisInputs[0]
    authKey.value = new AuthKey({...user.genesisInputs[1]})
  }
})

const generateGenesisInputs = async () => {
  if (!user.wallet) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }
  try {
    const tx = await GenesisInput.generate(user.wallet! as Wallet, 2)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
    }
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }

}
</script>

