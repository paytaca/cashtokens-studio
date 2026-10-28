<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-px-xs q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h4 text-bold row items-center q-gutter-xs text-grey-4" style="text-wrap: wrap">
          <div class="flex items-center col justify-between">
            <div class="flex items-center">{{ $t('nftTransfer.title') }}</div>
            <div class="flex items-center token-symbol q-gutter-xs">
              <q-avatar>
                <q-img v-if="identitySnapshot?.uris?.icon"
                  :src="ipfsToGatewayUrl(identitySnapshot.uris.icon) as string"></q-img>
                <q-icon v-else name="token"></q-icon>
              </q-avatar>
              <span>{{ identitySnapshot?.token?.symbol }}</span>
            </div>
          </div>
        </q-toolbar-title>
      </q-toolbar>

      <q-card-section>
        <div v-if="isBurn" class="row items-start no-wrap q-gutter-x-sm text-justify q-mb-md">
          <q-icon name="warning" color="orange" size="sm" class="q-mt-xs" />
          <span class="text-body2 text-grey-4">{{ $t('nftTransfer.burnWarning') }}</span>
        </div>

        <div v-if="showAuthKeyWarning" class="row items-start no-wrap q-gutter-x-sm text-justify q-mb-md">
          <q-icon name="warning" color="warning" size="sm" class="q-mt-xs" />
          <span class="text-body2 text-grey-4">
            {{ $t('nftTransfer.authKeyWarning', { count: lockedCount }) }}
          </span>
        </div>

        <div v-if="hasAmount" class="row items-start no-wrap q-gutter-x-sm text-justify q-mb-md">
          <q-icon name="warning" color="warning" size="sm" class="q-mt-xs" />
          <span class="text-body2 text-grey-4">{{ $t('nftTransfer.amountWarning') }}</span>
        </div>

        <q-form ref="transferForm" @submit.prevent="onSubmit" class="nft-transfer-form q-gutter-md">
          <q-input :model-value="shortenTokenId(category)" :label="$t('nftTransfer.category')" outlined readonly size="lg">
            <template v-slot:append>
              <CopyText :text="category" />
            </template>
          </q-input>
          <q-input v-if="capability" :model-value="capability" :label="$t('nftTransfer.capability')" outlined readonly />
          <q-input v-if="commitment" :model-value="commitment" :label="$t('nftTransfer.commitment')" outlined readonly />
          <q-input v-if="hasAmount" :model-value="amount" :label="$t('nftTransfer.amount')" outlined readonly />
          <q-input v-if="!isBurn" v-model="recipient" ref="recipientInputElement" :label="$t('nftTransfer.recipient')"
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
        <q-btn v-if="isBurn" color="orange" text-color="dark" :label="$t('nftTransfer.submitBurn')"
          icon="local_fire_department" size="lg" @click.stop="(e) => transferForm.submit(e)" />
        <q-btn v-else color="primary" :label="$t('nftTransfer.submit')" icon="send" size="lg" :disable="!canSubmit"
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

const props = defineProps<{
  category: string
  capability?: string
  commitment?: string
  /** Only meaningful for mixed UTXOs; a pure NFT has nothing to show here. */
  amount?: string
  identitySnapshot?: IdentitySnapshot | null
  selfAddress?: string
  /** When set, the dialog explains that this NFT is the key to a vault holding this many outputs. */
  lockedCount?: number
  /** When set, the dialog burns instead of transferring: no recipient, the NFT goes to this address. */
  burnAddress?: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const { t } = useI18n()

const recipient = ref<string>('')
const recipientInputElement = ref()
const transferForm = ref()

/** The tokens ride along on the UTXO, so the recipient has to be able to receive them. */
const recipientRules = [
  (v: string) => !!v || t('nftTransfer.recipientRequired'),
  (v: string) => isTokenAwareAddress(v) || t('nftTransfer.recipientRule'),
]

const canSubmit = computed(() => isTokenAwareAddress(recipient.value))
const showAuthKeyWarning = computed(() => props.lockedCount !== undefined)
/** Burn mode: there is no recipient to ask for, the destination comes from configuration. */
const isBurn = computed(() => !!props.burnAddress)
/** A mixed UTXO carries a fungible amount alongside its NFT; moving it moves that amount too. */
const hasAmount = computed(() => Number(props.amount ?? 0) > 0)

const onSubmit = () => {
  if (isBurn.value) {
    onDialogOK({ recipient: props.burnAddress })
    return
  }
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
/**
 * The global `form { justify-items: center }` in app.scss makes each field shrink to its own content
 * width, so the inputs end up ragged. Reset it here (FungibleTransferDialog/FTBurnDialog do the same
 * with an inline `!important`).
 */
.nft-transfer-form {
  justify-items: initial;
}
</style>
