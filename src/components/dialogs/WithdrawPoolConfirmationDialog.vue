<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" class="text-title">
    <q-card class="q-px-xs q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-bold row items-center q-gutter-xs text-grey-4" style="text-wrap: wrap">
          <div class="flex items-center col justify-between">
            <div class="text-h4 flex items-center q-gutter-x-sm">
              <q-avatar>
                <q-icon name="img:/images/cauldron-logo.png" size="lg"></q-icon>
              </q-avatar><span>{{ $t('liquidityPoolsPage.withdrawDialog.title') }}</span>
            </div>
          </div>
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="row items-start no-wrap q-gutter-x-sm text-justify q-mb-md">
          <q-icon name="warning" color="warning" size="sm" class="q-mt-xs" />
          <span class="text-body1 text-grey-4">{{ $t('liquidityPoolsPage.withdrawDialog.message') }}</span>
        </div>
        <div class="q-gutter-md q-mt-md">
          <q-input :model-value="poolId" :label="$t('liquidityPoolsPage.withdrawDialog.poolId')" outlined readonly
            size="lg">
            <template v-slot:append>
              <CopyText :text="poolId" />
            </template>
          </q-input>
          <q-input :model-value="bchAmount" :label="$t('liquidityPoolsPage.withdrawDialog.bchAmount')" outlined
            readonly />
          <q-input :model-value="tokenAmount" :label="$t('liquidityPoolsPage.withdrawDialog.tokenAmount')" outlined
            readonly />
          <q-input :model-value="destinationAddress" :label="$t('liquidityPoolsPage.withdrawDialog.destination')"
            outlined readonly>
            <template v-slot:append>
              <CopyText :text="destinationAddress" />
            </template>
          </q-input>
          <div class="text-caption text-grey-6">{{ $t('liquidityPoolsPage.withdrawDialog.feeNote') }}</div>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn flat :label="$t('button.cancel')" color="grey-6" @click="onDialogCancel" />
        <q-btn color="primary" :label="$t('liquidityPoolsPage.withdrawDialog.proceed')" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import CopyText from 'components/CopyText.vue'

defineOptions({ name: 'WithdrawPoolConfirmationDialog' })

defineEmits([
  ...useDialogPluginComponent.emits,
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

defineProps<{
  symbol: string
  iconUrl?: string
  poolId: string
  bchAmount: string
  tokenAmount: string
  destinationAddress: string
}>()
</script>
