<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-card-section>
        <template v-if="!genesisInput || !authKey">
          <q-banner class="q-mt-lg q-px-lg q-py-xl text-justify" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'"
            rounded>
            <div class="row justify-center q-mb-md">
              <q-icon name="info" size="lg" color="info" />
            </div>
            <p>
              Creating a new token requires a "genesis input". A valid genesis input is just a utxo that is the
              first
              output(v-out 0) of a previous transaction.
            </p>

            <p>
              Currently <span class="text-negative"> your wallet have {{ user.genesisInputs?.length }}</span> utxo that
              we can use as genesis input. This
              operation <span class="text-positive">requires 1</span> genesis input. You can create a genesis input by
              clicking the button below.
            </p>

            <template v-slot:action>
              <BusyButton :busy-label="genesisInputInstance?.processing" label="Generate genesis input"
                @click="generateGenesisInputs" color="primary" />
            </template>
          </q-banner>
        </template>

        <template v-else>
          <TokenGenesisForm :token-type="(tokenType as ('ft' | 'nft'))" :genesis-input="genesisInput"
            :auth-key="authKey" :owner-wallet="(user.wallet! as Wallet)" :create-auth-key="false"
            @genesis-result="(r) => emit('genesisResult', r)" />
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">

import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { UtxoI, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { GenesisInput, AuthKey } from 'src/apps'
import TokenGenesisForm from 'src/components/forms/TokenGenesisForm.vue'
import { useEventBus } from 'src/composables';

defineProps<{ tokenType: 'ft' | 'nft', authKey: AuthKey }>()
const emit = defineEmits<{
  // Just so we can forward event from TokenGenesisForm 
  (e: 'genesisResult', val: { txid: string, tokenSymbol?: string }): void
}>()
const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const genesisInput = ref<UtxoI>()
const genesisInputInstance = ref<GenesisInput>(new GenesisInput({ vout: 0, satoshis: 0, txid: '' }, user.transactionSigner))

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 1) {
    genesisInput.value = value[0]
  }
})

onMounted(async () => {
  genesisInputInstance.value = new GenesisInput({ vout: 0, satoshis: 0, txid: '' }, user.transactionSigner)
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
    const tx = await genesisInputInstance.value.generate(user.wallet! as Wallet, 1)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'GenesisInput.generate',
        timestamp: new Date().getTime(),
        successMsg: 'Generated genesis input(v-out 0 utxo)'
      })
    }
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }

}
</script>
