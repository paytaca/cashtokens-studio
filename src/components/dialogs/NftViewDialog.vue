<!-- Quasar dialog -->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="full-width">
      <NftView :token-symbol="tokenSymbol" :token-icon-uri="tokenIconUri" :token-category="tokenCategory"
        :nft-type-key="nftTypeKey" :nftType="nftType" :utxo="utxo" />
      <q-card-actions align="right">
        <q-btn @click="onDialogOK()" text-color="primary" size="lg">Ok</q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { NftType, TokenCategory, UtxoI } from 'mainnet-js'
import NftView from 'src/components/NftView'

defineProps<{
  tokenSymbol: string,
  tokenIconUri: string,
  tokenCategory: string,
  nftTypeKey: string,
  nftType: NftType,
  utxo?: UtxoI
}>()

const $q = useQuasar()

defineEmits([
  ...useDialogPluginComponent.emits,
])


const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
</script>

<style lang="scss">
@import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
</style>
