<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar class="text-h3">
        <q-toolbar-title>Token Genesis Success <q-icon name="check_outlined" color="green"
            size="sm"></q-icon></q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-markup-table>
          <tbody>
            <tr>
              <td>
                Tx
              </td>
              <td colspan="2">
                {{ txid }}
              </td>
            </tr>
            <tr v-if="token.tokenUris?.icon">
              <td colspan="2">
                <img :src="token.tokenUris.icon" alt="">
              </td>
            </tr>
            <tr>
              <td>Token Id</td>
              <td>{{ token.token?.tokenId }}</td>
            </tr>
            <tr>
              <td>Token Symbol</td>
              <td>{{ token.tokenCategory?.symbol }}</td>
            </tr>
            <tr v-if="token.tokenCategory?.decimals">
              <td>Token Symbol</td>
              <td>{{ token.tokenCategory?.symbol }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => emit('close')" label="Close" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import BusyButton from 'src/components/BusyButton.vue'
import { CashToken } from 'src/app';

const emit = defineEmits<{
  (e: 'close'): void
}>()

const props = defineProps<{
  txid: string
  token: CashToken
}>()

</script>
