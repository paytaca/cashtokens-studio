<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-center q-my-lg">
          <template v-if="!genesisInputUtxo || !authKey">
            <q-banner class="q-mt-lg" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'" rounded>
              <template v-slot:avatar>
                <q-icon name="warning" color="warning" size="xs" />
              </template>
              Your wallet has {{ user.genesisInputs?.length || 0 }} vout-0 utxo.
              This operation will create a Token and an AuthKey so it requires 2 vout-0
              utxos as genesis inputs. If you want to use an existing AuthKey <q-btn to="/issuer/manage/authkeys"
                label="Click Here" size="md" color="secondary" dense flat no-caps />
              <template v-slot:action>
                <BusyButton :busy-label="genesisInputInstance?.processing" label="Generate genesis input"
                  @click="generateGenesisInputs" color="primary" />
              </template>
            </q-banner>
          </template>
          <template v-else>
            <TokenGenesisForm :token-type="(route.params.tokenType as ('ft' | 'nft' | 'fnft'))"
              :genesis-input="genesisInputUtxo" :auth-key="authKey" :owner-wallet="(user.wallet! as Wallet)"
              :create-auth-key="true" />
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
import { useStatusBar } from 'src/composables/useStatusBar'

const $q = useQuasar()
const user = useUser()
const route = useRoute()
const authKey = ref<AuthKey>()
const genesisInputUtxo = ref<UtxoI>()
const genesisInputInstance = ref<GenesisInput>()
const { setStatusProvider } = useStatusBar()

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 2) {
    // use first for AuthKey
    genesisInputUtxo.value = value[0]
    authKey.value = new AuthKey({ ...value[1] })
  }
})

onMounted(async () => {
  if (user.genesisInputs && user.genesisInputs?.length >= 2) {
    genesisInputUtxo.value = user.genesisInputs[0]
    authKey.value = new AuthKey({ ...user.genesisInputs[1] })
  }
})

const generateGenesisInputs = async () => {

  if (!user.wallet) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }
  try {
    genesisInputInstance.value = new GenesisInput({ vout: 0, satoshis: 0, txid: '' }) // 
    setStatusProvider(genesisInputInstance.value)
    const tx = await genesisInputInstance.value.generate(user.wallet! as Wallet, 2)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
    }
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }

}
</script>

