<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-px-xs q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h4 text-bold row items-center q-gutter-xs text-grey-4" style="text-wrap: wrap">
          <div class="flex items-center col justify-between">
            <div class="flex items-center">{{ $t('authguard.transferOwnership.dialogTitle') }}</div>
            <div class="flex items-center token-symbol q-gutter-xs">
              <q-avatar>
                <q-img v-if="identitySnapshot?.uris?.icon"
                  :src="ipfsToGatewayUrl(identitySnapshot.uris.icon) as string"></q-img>
              </q-avatar>
            </div>
          </div>
        </q-toolbar-title>
      </q-toolbar>

      <q-card-section>
        <div class="row items-start no-wrap q-gutter-x-sm text-justify q-mb-md">
          <q-icon name="warning" color="warning" size="sm" class="q-my-md" />
          <span class="text-body2 text-grey-4">
            {{ $t('authguard.transferOwnership.contextWarning', { count: lockedCount ?? 0 }) }}
          </span>
        </div>

        <q-form ref="transferForm" @submit.prevent="onSubmit" class="authkey-transfer-form q-gutter-md q-mt-md">
          <FormField>
            <label for="">Token Symbol</label>
            <q-input :model-value="identitySnapshot?.token?.symbol || 'Unknown Token'" outlined readonly size="lg">

            </q-input>
          </FormField>

          <q-input :model-value="shortenTokenId(category)" :label="$t('createAuthkey.tokenIdCandidate')" outlined
            readonly size="lg">
            <template v-slot:append>
              <CopyText :text="category" />
            </template>
          </q-input>
          <q-input v-if="commitment" :model-value="commitment" :label="$t('createAuthkey.commitment')" outlined
            readonly />
          <!-- Recipient labels and rules are shared with the NFT transfer dialog. -->
          <q-input v-model="recipient" ref="recipientInputElement" :label="$t('nftTransfer.recipient')"
            :placeholder="$t('nftTransfer.recipientPlaceholder')" :rules="recipientRules" outlined autofocus
            hide-bottom-space>
            <template v-slot:append>
              <q-btn v-if="selfAddress" @click="sendToSelf" text-color="primary" no-caps>{{ $t('nftTransfer.self') }}
              </q-btn>
            </template>
          </q-input>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn flat no-caps :label="$t('button.cancel')" color="grey-6" v-close-popup />
        <q-btn color="primary" :label="$t('nftTransfer.submit')" icon="mdi-send" :disable="!canSubmit"
          @click.stop="(e) => transferForm.submit(e)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { isTokenAwareAddress, shortenTokenId } from 'src/core/utils'
import type { IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema'
import CopyText from 'components/CopyText.vue'
import FormField from '../FormField.vue'

const props = defineProps<{
  /** The AuthKey NFT category: whoever holds this NFT controls everything the vault locks. */
  category: string
  commitment?: string
  identitySnapshot?: IdentitySnapshot | null
  /** How many outputs the vault locks right now, quoted in the warning. */
  lockedCount?: number
  selfAddress?: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const { t } = useI18n()

const recipient = ref<string>('')
const recipientInputElement = ref()
const transferForm = ref()

/** The tokens ride along on the UTXO, so the new owner has to be able to receive them. */
const recipientRules = [
  (v: string) => !!v || t('nftTransfer.recipientRequired'),
  (v: string) => isTokenAwareAddress(v) || t('nftTransfer.recipientRule'),
]

const canSubmit = computed(() => isTokenAwareAddress(recipient.value))

const onSubmit = () => {
  if (!canSubmit.value) return
  onDialogOK({ recipient: recipient.value })
}

const sendToSelf = () => {
  if (!props.selfAddress) return
  recipient.value = props.selfAddress
  nextTick(() => {
    const inputEl = recipientInputElement.value?.$el?.querySelector('input')
    if (inputEl) {
      inputEl.focus()
      const len = inputEl.value.length
      inputEl.setSelectionRange(len, len)
    }
  })
}
</script>

<style scoped>
/** See NFTTransferDialog: the global `form { justify-items: center }` makes fields shrink to fit. */
.authkey-transfer-form {
  justify-items: initial;
}
</style>
