<template>
  <q-dialog v-close-popup @before-hide="beforeHide" @before-show="beforeShow">
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">
          Transfer {{ nftMetadata?.name || nft?.tokenCategory?.symbol }} NFT
        </q-toolbar-title>
        <TokenCategory v-if="nft?.token?.tokenId" :token-id="nft.token.tokenId" />
      </q-toolbar>
      <div v-if="nftIsAuthKey?.isAuthKey" class="q-mx-md text-justify q-my-md">
        <q-icon name="warning" color="warning" size="sm"></q-icon>
        <span>
          Warning! This NFT is an AuthKey (<q-icon name="key" color="warning"></q-icon>) to an AuthGuard with {{
            nftIsAuthKey.lockedTokens?.length || 0 }} locked token identity.
          If you transfer this NFT you'll no longer be able to manage the token(s) locked by the AuthGuard contract.
          <q-btn @click.stop="_openLockedTokensDialog" flat color="secondary" no-caps>View the
            locked tokens</q-btn>
        </span>
      </div>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input :model-value="nft?.token?.tokenId" label="Token ID/Category" filled dense disable
            stack-label></q-input>
          <q-input :model-value="nft?.token?.capability" label="Token Capability" filled dense disable
            stack-label></q-input>
          <q-input v-if="props.nft?.token?.commitment"
            :model-value="convertHexLEtoBigInt(props.nft?.token?.commitment).toString()" label="Token Commitment" filled
            dense stack-label disable>
            <template v-slot:prepend>
              <q-btn icon-right="pin" size="sm" flat dense />
            </template>
          </q-input>
          <q-input :model-value="commitmentCopy" label="Token Commitment (Raw hex value, actual value on-chain)" filled
            dense stack-label disable>
            <template v-slot:prepend>
              <q-btn :label="commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm" no-caps
                :icon-right="commitmentFormat === 'decimal' ? 'pin' : undefined" />
            </template>
          </q-input>
          <q-input v-model="form.to" label="Input Recipient's Token Address*" filled dense
            :disable="Boolean(nft.processing)" autofocus />
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => transferNFT()" label="Transfer NFT" :busyLabel="nft.processing" color="primary"
          :disable="!form.to || Boolean(nft.processing)" />
      </q-card-actions>
    </q-card>
    <AuthGuardTokenListDialog v-if="authGuardTokenListDialog"
      :model-value="authGuardTokenListDialog === AuthGuardTokenListDialog.__name"
      :auth-guard="(authGuardAndAuthKey.authGuard as AuthGuard)" :auth-key="(authGuardAndAuthKey.authKey as AuthKey)"
      @hide="hideLockedTokensDialog" />
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onUpdated } from 'vue';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { AuthGuard, AuthKey, CashToken } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import { useQuasar } from 'quasar';
import { useEventBus } from 'src/composables';
import { shortenAddress, shortenTokenId, shortenTx } from 'src/app/utils';
import { useUI } from 'src/stores/ui'
import { UtxoI, Wallet, delay, NftType } from 'mainnet-js';
import { useDialogs } from 'src/composables'
import convertHexLEtoBigInt from 'src/app/utils/convertHexLEtoBigInt';
import AuthGuardTokenListDialog from './AuthGuardTokenListDialog.vue';
const props = defineProps<{
  decimals?: string,
  nft: CashToken
}>()
const { $ebus } = useEventBus()
const emit = defineEmits<{
  (e: 'nftTransferred', val: { tokenId: string, recipient: string }): void
}>()

const $q = useQuasar()
const ui = useUI()
const user = useUser()
const nftMetadata = ref<NftType>()
const { dialog: authGuardTokenListDialog, dialogData: authGuardAndAuthKey, openDialog: openLockedTokensDialog, onHide: hideLockedTokensDialog } = useDialogs()
const nftIsAuthKey = ref<{ isAuthKey: boolean, lockedTokens?: UtxoI[], authKeyInstance?: AuthKey }>({ isAuthKey: false })
const commitmentCopy = ref<string>()
const commitmentFormat = ref<'decimal' | 'hex'>('hex')
const form = ref<{ to: string, amount: string | number }>({
  to: '',
  amount: ''
})


const transferNFT = async () => {
  if (props.nft?.token?.tokenId) {
    try {
      const tx = await props.nft?.transferNFT({ newOwner: form.value.to })
      if (tx) {
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.transferNFT',
          timestamp: new Date().getTime(),
          successMsg: `Transferred 1 ${props.nft?.tokenCategory?.symbol || shortenTokenId(props.nft?.token?.tokenId)} NFT commitment = ${commitmentCopy.value || '<empty>'} to ${shortenAddress(form.value.to)}`
        })

        ui.setStatusMessage({
          statusMessage: `Transferred 1 ${props.nft?.tokenCategory?.symbol || shortenTokenId(props.nft?.token?.tokenId)} NFT with commitment = ${commitmentCopy.value || '<empty>'} to ${shortenAddress(form.value.to)}`,
          statusMessageType: 'success',
          statusMessageTxid: tx
        })
        emit('nftTransferred', { tokenId: props.nft.token.tokenId, recipient: form.value.to })
      }
    } catch (error: any) {
      console.log(error)
      ui.setStatusMessage({
        statusMessage: error.message,
        statusMessageType: 'error'
      })
      $q.notify({ type: 'negative', message: error.message })

    }
  }
}

const _openLockedTokensDialog = () => {
  openLockedTokensDialog(AuthGuardTokenListDialog.__name, { authGuard: nftIsAuthKey.value.authKeyInstance?.authGuard, authKey: nftIsAuthKey.value.authKeyInstance })
}

const beforeHide = async () => {
  // Reset dialog
  form.value.amount = ''
  commitmentCopy.value = ''
  nftIsAuthKey.value.isAuthKey = false
  form.value.to = ''
  // commitmentFormat.value = 'hex'
}

const beforeShow = async () => {
  form.value.amount = props.nft?.token?.amount ? String(props.nft.token!.amount) : 0
  commitmentCopy.value = props.nft?.token?.commitment
  if (props.nft?.token?.tokenId && props.nft?.token?.commitment) {
    try {
      const resp = await fetch(`${process.env.BCMR_API}bcmr/${props.nft?.token?.tokenId}/token/nfts/${props.nft?.token?.commitment}`)
      nftMetadata.value = await resp.json()
    } catch (error) {
      console.log(error)
    }
  }

}

onUpdated(async () => {
  if (props.nft?.token?.commitment == '00') {
    ui.setStatusMessage({
      statusMessage: 'Checking if this NFT is an AuthKey. Plase wait...',
      statusMessageSpinner: true
    })
    // check this might be an authkey
    const authKey = new AuthKey({ ...props.nft.utxo, ownerWallet: user.wallet as Wallet })
    const lockedTokens = await authKey.authGuard.getLockedTokenIdentities()

    await delay(1000)
    ui.clearStatusMessage()
    if (lockedTokens) {
      nftIsAuthKey.value = { isAuthKey: true, lockedTokens, authKeyInstance: authKey }
    } else {
      nftIsAuthKey.value = { isAuthKey: true, lockedTokens: [] }
    }
  }
})


</script>
