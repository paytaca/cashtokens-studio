<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Send Tokens</q-toolbar-title>
        <TokenCategory v-if="tokenBalance.tokenId" :token-id="tokenBalance.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input v-if="tokenBalance.tokenId" :model-value="tokenBalance.tokenId" label="Token ID/Category" filled dense
            disable></q-input>
          <q-input v-if="tokenBalance.balance > 0"
            :model-value="!form.amount ? String(tokenBalance.balance) : String(tokenBalance.balance - BigInt(form.amount))"
            :label="!form.amount ? 'Current Balance' : 'New Balance'" filled dense disable></q-input>
          <q-input v-model="form.amount" label="Amount to send" placeholder="0" filled dense>
            <template v-slot:append>
              <q-btn size="sm" color="warning" flat dense @click="form.amount = String(tokenBalance.balance)">Send
                all</q-btn>
            </template>
          </q-input>
          <q-input v-model="form.to" label="Recipient's Address" filled dense>
            <template v-slot:append>
              <q-btn size="sm" color="warning" flat dense
                @click="form.to = (user.wallet?.getTokenDepositAddress() as string)">Send to
                self</q-btn>
            </template>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => send()" label="Send Tokens" :busyLabel="CashToken.processing" color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TokenBalance } from 'src/app/types';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { CashToken } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import { Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { tokeshiToNumber } from 'src/app/utils';

const props = defineProps<{
  decimals?: string,
  tokenBalance: TokenBalance
}>()

const $q = useQuasar()
const user = useUser()

const form = ref<{ to: string, amount: string }>({
  to: '',
  amount: ''
})

const send = async () => {
  try {
    console.log('SENDING')
    const tx = await CashToken.send({
      tokenId: props.tokenBalance.tokenId,
      to: form.value.to,
      amount: BigInt(form.value.amount),
      // sourceUtxos: props.tokenBalance.utxos,
      ownerWallet: user.wallet as Wallet
    })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + tx })
    }
  } catch (error) {
    console.log(error)
  }


}
</script>
