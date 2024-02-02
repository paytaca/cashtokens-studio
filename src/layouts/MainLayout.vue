<template>
  <q-layout view="lHh Lpr lFf">
    <TransactionLogger />
    <q-header style="background-color: rgb(20,20,20)">
      <q-toolbar class="q-py-sm">
        <q-btn flat dense round icon="menu" aria-label="Menu" size="lg" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          <q-img v-if="route.path !== '/'" to="/" @click.stop="router.push('/')" src="images/cts_transparent.png"
            style="max-height: 3em;object-fit: fill;max-width:8em"></q-img>
          <code v-if="getAppEnv() !== 'production'" class="text-caption">[TEST MODE]</code>
        </q-toolbar-title>
        <div v-if="user.walletAddress">
          <q-btn-group flat class="text-right">
            <q-btn-dropdown auto-close rounded icon="manage_accounts" size="lg">
              <q-list padding style="width: 300px">

                <!-- <q-separator inset />  -->
                <q-item-label header>Addresses</q-item-label>
                <q-item clickable
                  @click="() => { copyText(user.walletAddress); $q.notify({ message: 'Wallet Address Copied', timeout: 500 }) }">
                  <q-item-section avatar>
                    <q-avatar color="teal" text-color="white">
                      <q-img src="images/bitcoin-cash-circle.svg"></q-img>
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>BCH Address</q-item-label>
                    <q-item-label caption>{{ shortenAddress(user.walletAddress) }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item clickable
                  @click="() => { copyText(user.walletTokenAddress); $q.notify({ message: 'Token Address Copied', timeout: 500 }) }">
                  <q-item-section avatar>
                    <q-avatar icon="token" color="teal" text-color="white" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Token Address</q-item-label>
                    <q-item-label caption>{{ shortenAddress(user.walletTokenAddress) }}</q-item-label>
                  </q-item-section>
                  <!-- <q-item-section side>
                    <q-icon name="content_copy" color="amber" />
                  </q-item-section> -->
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </q-btn-group>
        </div>
        <light-switch />
        <span v-if="user.walletAddress" class="q-mx-md">
          <paytaca-connect v-if="user.walletType == 'paytaca'" variant="icon" />
          <wallet-connect v-else-if="user.walletType == 'walletconnect'" variant="icon" />
        </span>
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
          <q-btn round color="#434242" icon="west" style="background-color: #434242;" @click.stop="router.back()" />
          <q-toolbar-title class="text-h6">{{ ui.pageTitle || $route.meta?.pageTitle }}</q-toolbar-title>
        </q-toolbar>
        <router-view />
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
