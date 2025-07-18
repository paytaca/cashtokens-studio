<template>
  <q-layout view="lHh Lpr lFf">
    <TransactionLogger />
    <q-header style="background-color: rgb(20,20,20)">
      <q-toolbar class="q-py-sm">
        <q-btn flat dense round icon="menu" aria-label="Menu" size="lg" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          <q-img v-if="route.path !== '/'" to="/" @click.stop="router.push('/')"
            :src="$q.screen.xs ? 'images/cts_icon.png' : 'images/cts_transparent.png'"
            style="max-height: 3em;object-fit: fill;max-width:8em" class="cursor-pointer"></q-img>
          <code v-if="getAppEnv() !== 'production' && !$q.screen.xs" class="text-caption">[TEST MODE]</code>
        </q-toolbar-title>
        <div v-if="user.walletAddress" class="q-mx-sm">
          <q-btn-group class="text-right" style="position:relative">
            <q-btn-dropdown auto-close rounded size="lg" @before-show="onBeforeMenuShow"
              style="color: rgb(20,20,20);padding: 10px; border-radius: 10px;background-color:#282829d4; border: 2px solid #484854d4">
              <template v-slot:label>
                <q-avatar v-if="user.walletType == 'paytaca'" rounded size="md">
                  <q-img src="images/paytaca_icon.png"></q-img>
                </q-avatar>
                <q-avatar v-else-if="user.walletType == 'walletconnect'" rounded size="md">
                  <q-img src="images/walletconnect_icon.png"></q-img>
                </q-avatar>
                <q-icon v-else name="account_balance_wallet">
                </q-icon>
              </template>
              <q-list padding style="width: 300px">
                <q-item clickable to="/account/balance/fungibletokens">
                  <q-item-section avatar>
                    <q-avatar text-color="white" icon="money">
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Fungibles</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable to="/account/balance/collectibles">
                  <q-item-section avatar>
                    <q-avatar text-color="white" icon="collections">
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Collectibles (NFTs)</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable :to="{ name: 'recent-transactions' }">
                  <q-avatar class="q-mr-xs" icon="receipt">
                  </q-avatar>
                  <q-item-section>
                    <q-item-label>
                      <span style="position: relative;">
                        Recent Transactions
                        <q-badge v-if="pendingMultisigTransactions?.length > 0" color="orange" label="!" floating
                          rounded></q-badge>
                      </span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator inset class="q-my-md" />
                <q-item-label header>Addresses</q-item-label>
                <q-item clickable
                  @click="() => { copyText(user.walletAddress); $q.notify({ message: 'Wallet Address Copied', timeout: 500 }) }">
                  <q-item-section avatar>
                    <q-avatar color="bch" text-color="white">
                      <q-img src="images/bitcoin-cash-circle.svg"></q-img>
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-positive"
                      style="font-variant-numeric: tabular-nums; font-size: 1.1em; letter-spacing: 2px;">
                      {{ user.walletBchBalance }}
                    </q-item-label>
                    <q-item-label caption>{{ shortenAddress(user.walletAddress) }}</q-item-label>

                  </q-item-section>
                </q-item>
                <q-item clickable
                  @click="() => { copyText(user.wallet!.getTokenDepositAddress()); $q.notify({ message: 'Token Address Copied', timeout: 500 }) }">
                  <q-avatar class="q-mr-xs">
                    <q-img src="images/cashtokens.svg"></q-img>
                  </q-avatar>
                  <q-item-section>
                    <!-- <q-item-label>TOKEN</q-item-label> -->
                    <q-item-label caption>{{ shortenAddress(user.wallet!.getTokenDepositAddress()) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator inset class="q-my-md" />
                <q-item>
                  <paytaca-connect v-if="user.walletType == 'paytaca'" variant="button" class="full-width" />
                  <wallet-connect v-else-if="user.walletType == 'walletconnect'" variant="button" />
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <q-badge v-if="pendingMultisigTransactions?.length > 0" color="orange" label="!" floating></q-badge>
          </q-btn-group>
        </div>
        <!-- <light-switch /> -->
      </q-toolbar>
    </q-header>
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered overlay v-close-popup>
      <div class="text-right q-ma-lg">
        <q-btn size="md" text-color="grey-6" icon="chevron_left" label="hide" @click="toggleLeftDrawer"
          class="justify-right" dense flat />
      </div>

      <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
        <div class="row justify-center q-gutter-sm q-pt-lg">
          <div class="col-12 text-center">
            <q-btn to="/" size="2em" flat color="primary">
              <q-avatar size="4em">
                <q-img src="images/cts_icon.png"></q-img>
              </q-avatar>
            </q-btn>
          </div>
        </div>
        <SidebarMenu />
      </q-scroll-area>
    </q-drawer>
    <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }"
      :thumb-style="{ width: '0px' }">
      <q-page-container>
        <q-toolbar v-if="ui.routeBack" class="q-mt-sm q-mb-sm">
          <!-- <q-btn round color="#434242" icon="west" style="background-color: #434242;" :to="{ name: ui.routeBack }" /> -->
          <q-toolbar-title class="text-h6">{{ ui.pageTitle || $route.meta?.pageTitle }}</q-toolbar-title>
        </q-toolbar>
        <template v-if="user.wallet?.isMultisig() && pendingMultisigTransactions?.length > 0">
          <div class="q-pa-md q-gutter-sm">
            <q-banner inline-actions rounded class="bg-orange-400 text-warning">
              It looks like you still have a pending multisig transaction. Please make sure to finalize and broadcast it
              first, before creating a new transaction in Cashtokens Studio, to avoid any issues.
              <template v-slot:action>
                <q-btn v-if="route.name !== 'recent-transactions'" color="warning" icon="launch" label="Check it out"
                  text-color="black" :to="{ name: 'recent-transactions' }" no-caps />
              </template>
            </q-banner>
          </div>
        </template>
        <router-view />
        <q-ajax-bar />
      </q-page-container>
    </q-scroll-area>
    <MessageDialog v-model="messageDialog" />
  </q-layout>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import ClientDB from 'src/apps/clientonly/ClientDB';
import SidebarMenu from 'components/SidebarMenu.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';
import WalletConnect from 'components/WalletConnect.vue';
import { useUser } from 'src/stores/user'
import { useUI } from 'src/stores/ui';
import TransactionLogger from 'src/components/TransactionLogger.vue'
import getAppEnv from 'src/apps/utils/getAppEnv'
import MessageDialog from 'src/components/dialogs/MessageDialog.vue';
import { useInit } from 'src/composables/useInit';
import { shortenAddress, copyText } from 'src/apps/utils'
const leftDrawerOpen = ref(false)
const user = useUser()
const ui = useUI()
const route = useRoute()
const router = useRouter()
const messageDialog = ref<boolean>(false)
const pendingMultisigTransactions = ref([])

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}


const onBeforeMenuShow = () => {
  const db = ClientDB.getInstance()
  db.getPendingMultisigTransactions().then((v) => {
    pendingMultisigTransactions.value = v
  })
}

useInit()

watch(() => route.path, () => {
  ui.clearStatusMessage()
})

watch(() => ui.statusMessage, (value) => {
  if (value) {
    messageDialog.value = true
  }
})

watch(() => user.wallet, async (wallet) => {
  if (wallet !== undefined && typeof wallet.isMultisig === 'function') {
    const db = ClientDB.getInstance()
    pendingMultisigTransactions.value = await db.getPendingMultisigTransactions()
  }
})

onMounted(async () => {
  if (!user.walletAddress) {
    router.push('/')
  }
  const db = ClientDB.getInstance()
  pendingMultisigTransactions.value = await db.getPendingMultisigTransactions()

})


</script>
