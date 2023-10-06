<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-card-section>
        <template v-if="!genesisInput || !authKey">
          <q-banner :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'" rounded>
            <template v-slot:avatar>
              <q-icon name="warning" color="warning" size="xs" />
            </template>
            Your wallet has {{ user.genesisInputs?.length || 0 }} vout-0 utxo.
            This operation requires 1 vout-0 utxo. Click the button below to
            generate.
            <template v-slot:action>
              <BusyButton :busy-label="GenesisInput.processing" label="Generate genesis input"
                @click="generateGenesisInputs" color="primary" />
            </template>
          </q-banner>
        </template>
        <template v-else>
          <TokenGenesisForm :token-type="(tokenType as ('ft' | 'nft'))" :genesis-input="genesisInput" :auth-key="authKey"
            :owner-wallet="(user.wallet! as Wallet)" :create-auth-key="false"
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
import { GenesisInput, AuthKey } from 'src/app'
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

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 1) {
    genesisInput.value = value[0]
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

