<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">My AuthKeys</h5>
        <q-expansion-item label="Description">
          <p>
            When you create a token (genesis) in CSStudio it's locked in a contract called an <q-btn
              href="https://github.com/mr-zwets/AuthGuard" target="_blank" color="secondary" flat dense label="AuthGuard"
              no-caps style="text-indent:0" />.
            An AuthKey (or Minting Baton) is an NFT that let's the holder manage the locked tokens.
            Holder of the AuthKey can manage the authchain, issue tokens from fungible reserves or mint new NFTs
            if the token created was a <code>minting</code> NFT.
            Don't send these keys to anyone unless you intend to give them permission to manage your tokens.
          </p>
        </q-expansion-item>

        <q-markup-table>
          <thead>
            <tr>
              <th>#</th>
              <th>AuthKey Id</th>
              <th>AuthGuard Contract Address</th>
              <th>No. of managed tokens</th>
              <th>Action</th>
            </tr>
          </thead>
          <TableBodySkeleton v-if="AuthKey.processing && !authKeys" :col-count="5" :row-count="3"
            :caption="AuthKey.processing" />
          <tbody v-else class="text-center">
            <tr v-for="authKey, i in authKeys" :key="'ai-rec-' + i">
              <td>{{ i + 1 }}</td>
              <td>
                <TokenCategory :tokenId="authKey?.utxo?.token?.tokenId" icon-right="key" />
              </td>
              <td>
                <CashAddress :cashaddr="authKey?.authGuard?.contract?.getTokenDepositAddress()"
                  tool-tip="Copy Contract Address" />
              </td>
              <td>
                <template v-if="authKey.processing">
                  <q-spinner color="cyan"></q-spinner><i>{{ authKey.processing }}</i>
                </template>
                <template v-else>
                  {{ authKey.unlockableTokens?.length }}
                </template>
              </td>
              <td>
                <q-btn icon="more_vert" size="md" round flat dense>
                  <q-menu>
                    <q-list>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthKeyCreateTokenDialog(AuthKeyCreateTokenDialog.__name, { authKey: authKey as AuthKey, tokenType: 'ft' })">
                        Use to create FT</q-item>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthKeyCreateTokenDialog(AuthKeyCreateTokenDialog.__name, { authKey: authKey as AuthKey, tokenType: 'nft' })">
                        Use to create NFT</q-item>
                      <q-item clickable v-close-popup
                        @click="wOpenAuthKeyTransferDialog(AuthKeyTransferDialog.__name, authKey as AuthKey)">Transfer
                        AuthKey</q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </td>
            </tr>
            <tr v-if="AuthKey.processing && authKeys">
              <td colspan="5">
                <q-spinner-grid size="xs"></q-spinner-grid> Refreshing list
              </td>
            </tr>
            <tr v-if="authKeys?.length === 0 && !AuthKey.processing">
              <td colspan="5">
                No data
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </div>
    <AuthKeyTransferDialog v-if="dialog" :auth-key="dialogData" :model-value="dialog === AuthKeyTransferDialog.__name"
      @hide="onHide" />
    <AuthKeyCreateTokenDialog v-if="dialog" :auth-key="dialogData.authKey" :tokenType="dialogData.tokenType"
      :model-value="dialog === AuthKeyCreateTokenDialog.__name" @hide="onHide" />
  </q-page>
</template>
<script setup lang="ts">

import { Wallet } from 'mainnet-js';
import { useUser } from 'src/stores/user';
import { onMounted, ref } from 'vue';
import { useDialogs } from 'src/composables'
import { AuthKey } from 'src/app'
import TokenCategory from 'src/components/TokenCategory.vue';
import TableBodySkeleton from 'src/components/TableBodySkeleton.vue';
import AuthKeyTransferDialog from 'src/components/dialogs/AuthKeyTransferDialog.vue'
import AuthKeyCreateTokenDialog from 'src/components/dialogs/AuthKeyCreateTokenDialog.vue'
import CashAddress from 'src/components/CashAddress.vue';

const user = useUser()

const authKeys = ref<AuthKey[] | undefined>()

const { dialog, dialogData, openDialog, onHide } = useDialogs()

onMounted(async () => {
  if (user.authKeys) {
    authKeys.value = user.authKeys as AuthKey[]
  }
  try {
    authKeys.value = await AuthKey.scanWalletForAuthKeys(user.wallet as Wallet)
    user.authKeys = authKeys.value
  } catch (error) {
    console.log(error)
  }
  scanAuthKeysForManagedCategories()
})

/**
 * Checks and loads the managed token categories of each AuthKey.
 * Basically just checking each AuthKey's associated
 * AuthGuard contract token address for tokens.
 */
const scanAuthKeysForManagedCategories = async () => {
  if (authKeys.value) {
    for (let i = 0; i < authKeys.value.length; i++) {
      authKeys.value[i].ownerWallet = user.wallet as Wallet
      await authKeys.value[i].loadUnlockableTokens()
    }
  }
}

/**
 * Just a wrapper to openDialog so we can attach the wallet to the authKey object
 */
const wOpenAuthKeyTransferDialog = (dialogName: string | undefined, authKey: AuthKey) => {
  authKey.ownerWallet = user.wallet! as Wallet
  openDialog(dialogName, authKey)
}

/**
 * Just a wrapper to openDialog so we can attach the wallet to the authKey object
 */
const wOpenAuthKeyCreateTokenDialog = (dialogName: string | undefined, dialogData: { authKey: AuthKey, tokenType: 'ft' | 'nft' }) => {
  dialogData.authKey.ownerWallet = user.wallet! as Wallet
  openDialog(dialogName, dialogData)
}


</script>
