<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Mint child NFT</q-toolbar-title>
        <TokenCategory v-if="minter.token?.tokenId" :token-id="minter.token.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input :model-value="minter.token?.tokenId" label="Token ID/Category" filled dense disable>
          </q-input>
          <div class="q-pa-sm rounded-borders" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'">
            Capability <sup><code>{{ form.capability }}</code></sup>
            <q-option-group name="preferred_genre" v-model="form.capability" :options="[
              { value: 'minting', label: 'Minting' },
              { value: 'mutable', label: 'Mutable' },
              { value: 'none', label: 'None' }
            ]" color="primary" inline />
          </div>
          <q-input v-model="form.commitment" label="Commitment" filled dense>
          </q-input>
          <q-input v-model="form.recipient" label="Recipient's Address" filled dense>
            <template v-slot:append>
              <q-btn dense flat label="Self" color="warning" @click="form.recipient = user.walletTokenAddress!" />
            </template>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => mintToken()" label="Mint Token" :busyLabel="minter.processing" color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NFTCapability } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { CashToken } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'

const props = defineProps<{
  minter: CashToken,
}>()

const emit = defineEmits<{
  (e: 'nftMinted', val: { tokenId: string, recipient: string, capability: NFTCapability, commitment: string }): void
}>()

const $q = useQuasar()
const user = useUser()
const form = ref<{ capability: NFTCapability, commitment: string, recipient: string }>({
  capability: NFTCapability.none,
  commitment: '',
  recipient: ''
})

const mintToken = async () => {
  if (props.minter) {
    try {
      const tx = await props.minter.mintChild(form.value)
      if (tx) {
        emit('nftMinted', { tokenId: props.minter.token!.tokenId, ...form.value })
        $q.notify({ type: 'positive', message: 'Success!Tx=' + tx })
      }
    } catch (error: any) {
      $q.notify({ type: 'negative', message: 'Error!' + error.message })
    }
  }
}
</script>
