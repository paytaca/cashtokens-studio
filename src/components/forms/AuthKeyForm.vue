<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title class="text-h5 text-bold">Create AuthKey</q-toolbar-title>
    </q-toolbar>
    <!-- <template v-if="authKey && authKey.processing">
      <q-spinner-grid></q-spinner-grid>
      {{ authKey.processing }}
    </template> -->
    <q-input v-if="genesisInput" :model-value="genesisInput.txid" :filled="true" disable square
      label="AuthKey ID (vout-0 utxo txid)" />
    <p v-else>No utxo suitable as auth Key in your address. Please send BCH to your address.</p>
    <div class="row justify-end q-my-lg">
      <BusyButton v-if="genesisInput" @click="createAuthKeyGenesis" :busy-label="authKey?.processing"
        label="Create AuthKey" :disable="!user.wallet || !genesisInput" color="primary" />
    </div>
  </q-form>
</template>
<script setup lang="ts">
import { UtxoI, Wallet } from 'mainnet-js';
import { AuthKey } from 'src/app';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue';
import { useQuasar } from 'quasar';
import { ref, onMounted } from 'vue';
import { useEventBus } from 'src/composables';
import shortenTx from 'src/app/utils/shortenTx';

const props = defineProps<{
  /**
   * The utxo that will be used as genesis input for the AuthKey NFT
   */
  genesisInput?: UtxoI,
  ownerWallet?: Wallet
}>()

const emit = defineEmits<{
  (e: 'authKeyCreated'): void
}>()

const { $ebus } = useEventBus()
const authKey = ref<AuthKey>()
const $q = useQuasar()
const user = useUser()

onMounted(() => {
  if (props.genesisInput && props.ownerWallet) {
    authKey.value = new AuthKey({ ...props.genesisInput, ownerWallet: props.ownerWallet }, user.transactionSigner)
  }
})

const createAuthKeyGenesis = async () => {
  try {
    authKey.value = new AuthKey({ ...props.genesisInput!, ownerWallet: props.ownerWallet }, user.transactionSigner)
    const tx = await authKey?.value.createGenesis({ commitment: '00', capability: 'none' })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Auth NFT created.Tx=' + shortenTx(tx) })
      if (!user.authKeys) {
        user.authKeys = []
      }
      user.authKeys?.push(authKey.value as AuthKey)
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthKey.createGenesis',
        timestamp: new Date().getTime(),
        successMsg: 'AuthKey created'
      })
      emit('authKeyCreated')
    }
  } catch (error: any) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Txn Failed!' + error.message })
  }
}
</script>
