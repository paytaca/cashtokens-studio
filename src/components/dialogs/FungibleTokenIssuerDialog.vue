<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Issue ft from reserves</q-toolbar-title>
        <TokenCategory v-if="authchainIdentity.token?.tokenId" :token-id="authchainIdentity.token.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input :model-value="authchainIdentity.tokenCategory?.decimals || 0" label="Decimals (Metadata)" borderless
            filled dense disable></q-input>

          <q-input :model-value="currentFtReservesDecimal" label="Current reserve supply (decimal)" filled borderless
            dense disable bottom-slots>
            <template v-slot:hint>
              <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
              <div class="row justify-end text-italic">{{ currentFtReserves }} (satoshi)</div>
            </template>
          </q-input>

          <q-input v-if="form.amount && Number(form.amount) > 0" :model-value="newReserveSupplyDecimal"
            label="New reserve supply (decimal)" filled dense disable bottom-slots>
            <template v-slot:hint>
              <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
              <div class="row justify-end text-italic">{{ String(BigInt(currentFtReserves) -
                BigInt(form.tokeshiAmount ||
                  form.amount)) }} (satoshi)</div>
            </template>
          </q-input>
          <q-input v-model="form.recipient" label="Recipient's Token Address" filled dense>
            <template v-slot:append>
              <q-btn color="warning" dense flat @click="form.recipient = user.walletTokenAddress!" label="Self" />
            </template>
          </q-input>
          <q-input v-model="form.amount" label="Enter Token amount in decimal"
            @update:model-value="() => form.tokeshiAmount = numberToTokeshi(Number(form.amount), String(authchainIdentity.tokenCategory?.decimals))"
            filled dense bottom-slots>

            <template v-slot:hint>
              <div v-if="!authchainIdentity.tokenCategory?.decimals && form.amount.includes('.')"
                class="row justify-end text-italic q-mb-sm">
                <q-icon name="warning" color="warning" /> Token has 0 or no decimal metadata. Value after decimal point
                will be
                ignored.
              </div>
              <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
              <div class="row justify-end text-italic text-lg items-center text-caption q-gutter-sm">
                <span>Token amount </span>
                <span class="text-weight-bold text-green-6">{{
                  form.tokeshiAmount || 0
                }}</span>
                <span>(satoshi)</span>
              </div>
            </template>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end q-my-lg">
        <BusyButton @click="() => releaseTokensFromReserveSupply()" :busyLabel="authchainIdentity.processing"
          label="Issue Tokens" color="primary q-mt-lg" size="md" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">

import { useQuasar } from 'quasar';
import { AuthchainIdentity } from 'src/app'
import { ref, computed } from 'vue';
import { useUser } from 'src/stores/user'
import { numberToTokeshi, tokeshiToNumber } from 'src/app/utils'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import shortenTokenId from 'src/app/utils/shortenTokenId';


const emit = defineEmits<{
  (e: 'tokensIssued', val: { tokenId: string, to: string, amount: string }): void
}>()

const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const $q = useQuasar()
const user = useUser()
const form = ref<{ recipient: string, amount: string, tokeshiAmount?: string }>({
  recipient: '',
  amount: '0',
})


const currentFtReserves = computed(() => Number(props.authchainIdentity.token!.amount).toString())
const currentFtReservesDecimal = computed(() => tokeshiToNumber(Number(currentFtReserves.value), props.authchainIdentity.tokenCategory?.decimals?.toString()))
const newReserveSupplyDecimal = computed(() => {
  let v = currentFtReservesDecimal.value - Number(form.value.amount)
  if (!props.authchainIdentity.tokenCategory?.decimals) {
    v = Math.floor(v)
  }
  return v
})

const releaseTokensFromReserveSupply = async () => {
  if (!form.value || !form.value.recipient || Number(form.value.amount) <= 0) {
    return $q.notify({ type: 'negative', message: 'Error!Amount and recipient required!' })
  }

  try {
    const amountToSend = form.value.tokeshiAmount ? form.value.tokeshiAmount : form.value.amount
    console.log('Amount to send', amountToSend)
    const tx = await props.authchainIdentity.releaseTokensFromReserveSupply({ to: form.value.recipient, amount: amountToSend })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTokenId(tx) })
    }
    emit('tokensIssued', { tokenId: props.authchainIdentity.token!.tokenId, to: form.value.recipient, amount: form.value.amount })
  } catch (error: any) {
    return $q.notify({ type: 'negative', message: error.message })
  }

}
</script>
