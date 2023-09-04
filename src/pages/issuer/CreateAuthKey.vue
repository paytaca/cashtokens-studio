<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-center q-my-lg">
          <template v-if="!genesisInput">
            <q-banner :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'" rounded>
              <template v-slot:avatar>
                <q-icon name="warning" color="warning" size="xs" />
              </template>
              Your wallet has {{ user.genesisInputs?.length || 0 }} vout-0 utxo.
              Cashtoken Studio requires 1 vout-0
              utxo to create an AuthKey.
              <template v-slot:action>
                <BusyButton :busy-label="GenesisInput.processing" label="Generate genesis input"
                  @click="generateGenesisInputs" color="primary" />
              </template>
            </q-banner>
          </template>
          <template v-else>
            <AuthKeyForm :genesis-input="genesisInput" :owner-wallet="(user.wallet as Wallet)" />
          </template>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { ref, watch, onMounted } from 'vue'
import { UtxoI, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { AuthKey, GenesisInput } from 'src/app'
import AuthKeyForm from 'src/components/forms/AuthKeyForm.vue'

const $q = useQuasar()
const user = useUser()
const genesisInput = ref<UtxoI>()

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 1) {
    // use first for AuthKey
    genesisInput.value = user.genesisInputs![0]
  }
})

onMounted(async () => {
  if (user.genesisInputs && user.genesisInputs?.length >= 1) {
    genesisInput.value = user.genesisInputs[0]
  }
})

const generateGenesisInputs = async () => {
  if (!user.wallet) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }
  try {
    const tx = await GenesisInput.generate(user.wallet! as Wallet, 1)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
    }
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }
}
</script>

