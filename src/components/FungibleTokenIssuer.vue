<template>
  <q-card class="q-px-sm q-py-lg full-width">
    <q-toolbar>
      <q-toolbar-title>Issue fungibles from reserves</q-toolbar-title>
      <TokenCategory v-if="authchainIdentity.token?.tokenId" :token-id="authchainIdentity.token.tokenId" />
    </q-toolbar>
    <q-card-section class="q-gutter-sm">
      <q-form class="q-gutter-sm">
        <q-input :model-value="currentFtReserves" label="Current reserve supply" filled dense disable></q-input>
        <q-input v-if="form.amount && Number(form.amount) > 0"
          :model-value="String(BigInt(currentFtReserves) - BigInt(form.amount))" label="New reserve supply" filled dense
          disable></q-input>
        <q-input v-model="form.recipient" label="Recipient's Token Address" filled dense></q-input>
        <q-input v-model="form.amount" label="Token amount or qty" filled dense></q-input>
      </q-form>
    </q-card-section>
    <q-card-actions class="row justify-end">
      <BusyButton @click="() => releaseTokensFromReserveSupply()" label="Issue Tokens"
        :busyLabel="authchainIdentity.processing" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { ref, computed, onMounted } from 'vue';
import TokenCategory from './TokenCategory.vue';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'

defineOptions({ name: 'FungibleTokenIssuer' })
const emit = defineEmits<{
  (e: 'tokensIssued', val: { tokenId: string, to: string, amount: string }): void
}>()

const $q = useQuasar()
const props = defineProps<{ authchainIdentity: AuthchainIdentity }>()
const form = ref<{ recipient: string, amount: string }>({
  recipient: '',
  amount: '0'
})
const currentFtReserves = computed(() => BigInt(props.authchainIdentity.token!.amount).toString())

onMounted(() => console.log(props.authchainIdentity))

const releaseTokensFromReserveSupply = async () => {
  if (!form.value || !form.value.recipient || Number(form.value.amount) <= 0) {
    return $q.notify({ type: 'negative', message: 'Error!Amount and recipient required!' })
  }

  try {
    const tx = await props.authchainIdentity.releaseTokensFromReserveSupply({ to: form.value.recipient, amount: form.value.amount })
    $q.notify({ type: 'positive', message: 'Success!Tx=' + tx })
    emit('tokensIssued', { tokenId: props.authchainIdentity.token!.tokenId, to: form.value.recipient, amount: form.value.amount })
  } catch (error: any) {
    return $q.notify({ type: 'negative', message: error.message })
  }

}
</script>
