<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Transfer Token</q-toolbar-title>
        <TokenCategory v-if="tokenBalance.tokenId" :token-id="tokenBalance.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input v-if="tokenBalance.balance > 0" :model-value="String(tokenBalance.balance)" label="Balance" filled
            dense disable></q-input>
          <q-input v-if="tokenBalance.balance > 0" v-model="form.amount" label="Amount to send" placeholder="0" filled
            dense disable>
            <template v-slot:append>
              <q-btn size="sm" color="warning">All</q-btn>
            </template>
          </q-input>
          <q-input v-model="form.to" label="Recipient's Address" filled dense></q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => sendToken()" label="Send Tokens" :busyLabel="token.processing" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import CashStudioToken from 'src/models/CashStudioToken';
import { ref } from 'vue';
import { TokenBalance } from '../types';

const props = defineProps<{
  token: CashStudioToken,
  tokenBalance: TokenBalance
}>()

const form = ref<{ to: string, amount: string }>({
  to: '',
  amount: ''
})

const sendToken = () => {
  console.log(props.token)
}
</script>
