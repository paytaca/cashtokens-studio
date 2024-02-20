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
          <q-btn-group class="text-right">
            <q-btn-dropdown auto-close rounded size="lg"
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
                      <!-- <q-img src="images/bitcoin-cash-circle.svg"></q-img> -->
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Coins</q-item-label>
                    <!-- <q-item-label caption>{{ shortenAddress(user.walletAddress) }}</q-item-label> -->
                  </q-item-section>
                </q-item>
                <q-item clickable to="/account/balance/collectibles">
                  <q-item-section avatar>
                    <q-avatar text-color="white" icon="collections">
                      <!-- <q-img src="images/bitcoin-cash-circle.svg"></q-img> -->
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Collectibles</q-item-label>
                    <!-- <q-item-label caption>{{ shortenAddress(user.walletAddress) }}</q-item-label> -->
                  </q-item-section>
                </q-item>
                <q-item clickable :to="{ name: 'recent-transactions' }">
                  <q-avatar class="q-mr-xs" icon="receipt">
                  </q-avatar>
                  <q-item-section>
                    <q-item-label>Recent Transactions</q-item-label>
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
                  @click="() => { copyText(user.walletTokenAddress); $q.notify({ message: 'Token Address Copied', timeout: 500 }) }">
                  <q-avatar class="q-mr-xs">
                    <q-img src="images/cts_icon.png"></q-img>
                  </q-avatar>
                  <q-item-section>
                    <q-item-label>TOKEN</q-item-label>
                    <q-item-label caption>{{ shortenAddress(user.walletTokenAddress) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator inset class="q-my-md" />
                <q-item>
                  <paytaca-connect v-if="user.walletType == 'paytaca'" variant="button" class="full-width" />
                  <wallet-connect v-else-if="user.walletType == 'walletconnect'" variant="button" />
                  <!-- <q-btn
                    @click.stop="user.walletType == 'paytaca' ? () => paytacaDisconnect() : () => walletConnectDisconnect()"
                    class="full-width" text-color="negative" size="lg">
                    <span v-if="user.walletAddress" class="q-ma-sm">
                      <q-avatar v-if="user.walletType == 'paytaca'" rounded size="md">
                        <q-img src="images/paytaca_icon.png"></q-img>
                      </q-avatar>
                      <q-avatar v-if="user.walletType == 'walletconnect'" rounded size="md">
                        <q-img src="images/paytaca_icon.png"></q-img>
                      </q-avatar>
                    </span>
                    <span>Disconnect</span>
                  </q-btn> -->
                  <!-- <q-item-section v-if="user.walletAddress">
                    <q-btn @click="user.walletType == 'paytaca' ? paytacaDisconnect : walletConnectDisconnect"
                      text-color="negative">
                      Disconnect
                    </q-btn>
                  </q-item-section> -->
                </q-item>

              </q-list>
            </q-btn-dropdown>
          </q-btn-group>
        </div>
        <!-- <light-switch /> -->
        <!-- <span v-if="user.walletAddress" class="q-mx-md">
          <paytaca-connect v-if="user.walletType == 'paytaca'" variant="icon" />
          <wallet-connect v-else-if="user.walletType == 'walletconnect'" variant="icon" />
        </span> -->
      </q-toolbar>


    </q-header>
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered overlay v-close-popup>
      <div class="text-right q-ma-sm">
        <q-btn flat size="lg" round icon="close" aria-label="Menu" @click="toggleLeftDrawer" class="justify-right" />
      </div>

      <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
        <div class="row justify-center q-gutter-sm q-pt-lg">
          <div class="col-12 text-center">
            <!-- <q-btn to="/" icon="home" size="50px" flat color="primary"> -->
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
      <q-page-container class="q-mb-lg q-px-sm">
        <q-toolbar v-if="ui.routeBack" class="q-my-lg">
          <q-btn round color="#434242" icon="west" style="background-color: #434242;" :to="{ name: ui.routeBack }" />
          <q-toolbar-title class="text-h6">{{ ui.pageTitle || $route.meta?.pageTitle }}</q-toolbar-title>
        </q-toolbar>
        <router-view />
        <q-ajax-bar />
      </q-page-container>
    </q-scroll-area>
    <MessageDialog v-model="messageDialog" />

  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import SidebarMenu from 'components/SidebarMenu.vue';
import LightSwitch from 'components/LightSwitch.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';
import WalletConnect from 'components/WalletConnect.vue';
import { useUser } from 'src/stores/user'
import { useUI } from 'src/stores/ui';
import CashAddress from 'src/components/CashAddress.vue'
import TransactionLogger from 'src/components/TransactionLogger.vue'
import getAppEnv from 'src/app/utils/getAppEnv'
import { useRoute, useRouter } from 'vue-router'
import MessageDialog from 'src/components/dialogs/MessageDialog.vue';
import { useDialogs } from 'src/composables';
import { useInit } from 'src/composables/useInit';
import { shortenAddress, copyText } from 'src/app/utils'
import { usePaytacaConnect } from 'src/composables/usePaytacaConnect';
import { useWalletConnect } from 'src/composables/useWalletConnect';
import ftAmountFormatter from 'src/app/utils/ftAmountFormatter'
const { paytacaDisconnect } = usePaytacaConnect()
const { walletConnectDisconnect } = useWalletConnect()
const leftDrawerOpen = ref(false)
const user = useUser()
const ui = useUI()
const route = useRoute()
const router = useRouter()
const { dialog, dialogData, dialogOtherData, openDialog, onHide, hideDialog } = useDialogs()
const messageDialog = ref<boolean>(false)
const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
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

// onMounted(() => {
//   window.onbeforeunload = () => {
//     router.push('/')
//   }
// })
onMounted(() => {
  if (!user.walletAddress) {
    router.push('/')
  }
})


</script>

