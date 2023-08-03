<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Issue fungibles from reserves</q-toolbar-title>
        <TokenCategory v-if="identityOutput.tokenId" :token-id="identityOutput.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input :model-value="currentFtReserves" label="Current supply (in reserves)" filled dense disable></q-input>
          <q-input v-if="amount && Number(amount) > 0" :model-value="Number(currentFtReserves) - Number(amount)"
            label="New supply (in reserves)" filled dense disable></q-input>
          <q-input v-model="recipient" label="Recipient's Address" filled dense></q-input>
          <q-input v-model="amount" label="Token amount or qty" filled dense></q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <!-- <q-btn @click="() => issueTokens()">{{ newIdentityOutput.processing || 'Issue Tokens' }}</q-btn> -->
        <BusyButton @click="() => issueTokens()" label="Issue Tokens" :busyLabel="newIdentityOutput.processing" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { ref, computed, onMounted } from 'vue';
import TokenCategory from './TokenCategory.vue';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import { Wallet } from 'mainnet-js';
import BusyButton from 'src/components/BusyButton.vue'

defineOptions({ name: 'FungibleTokenIssuer' })
const $q = useQuasar()
const user = useUser()
const props = defineProps<{ identityOutput: AuthchainIdentity }>()
const recipient = ref<string>()
const amount = ref<string>()
const newIdentityOutput = ref<AuthchainIdentity>(
  new AuthchainIdentity({ ...props.identityOutput, ownerWallet: user.wallet as Wallet })
)
const currentFtReserves = computed(() => props.identityOutput.amount)

onMounted(() => console.log(props.identityOutput))

const issueTokens = () => {
  console.log('ISSUING TOKENS', newIdentityOutput)
  if (!recipient.value || !amount.value || Number(amount.value) === 0) {
    $q.notify({ type: 'negative', message: 'Error!Amount and recipient required!' })
  }
  newIdentityOutput.value.tokenId = props.identityOutput.tokenId
  newIdentityOutput.value.issueFungibleTokens(amount.value as string, recipient.value as string)
    .then((tx) => {
      if (tx) {
        $q.notify({ type: 'positive', message: 'Tokens issued' })
      }
    })
    .catch((error) => {
      $q.notify({ type: 'negative', message: error?.toString() })
    })
  // try {
  //   const tx = await newIdentityOutput.value.issueFungibleTokens(amount.value as string, recipient.value as string)

  // } catch (error) {
  //   $q.notify({ type: 'negative', message: error?.toString() })
  // }

}
</script>
