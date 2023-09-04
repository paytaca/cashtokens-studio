<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="bg-teal-10">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          Cashtokens Studio <code v-if="getAppEnv() !== 'production'">[TEST MODE]</code>
        </q-toolbar-title>
        <light-switch />
        <paytaca-connect />
      </q-toolbar>
    </q-header>
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }">
        <div class="row justify-center q-gutter-sm q-pt-lg">
          <div class="col-12 text-center">
            <!-- <q-avatar>
              <q-img src="images/bch-logo.png"></q-img>
            </q-avatar> -->
            <q-btn to="/" icon="home" size="xl" flat />
          </div>
          <div v-if="user.wallet" class="col-12 text-center q-gutter-sm">
            <CashAddress :cashaddr="user.walletAddress" type="cash" />
            <CashAddress :cashaddr="user.wallet!.getTokenDepositAddress()" type="token" />
          </div>
        </div>
        <SidebarMenu />
      </q-scroll-area>
    </q-drawer>
    <q-scroll-area style="position:relative; height: 100vh; max-width: 100vw;" :bar-style="{ width: '0px' }"
      :thumb-style="{ width: '0px' }">
      <q-page-container>
        <router-view />
        <!-- <q-inner-loading :showing="ui.pageLoader.show" :label="ui.pageLoader.label" label-class="text-teal"
          label-style="font-size: 1.1em" /> -->
      </q-page-container>
    </q-scroll-area>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import SidebarMenu from 'components/SidebarMenu.vue';
import LightSwitch from 'components/LightSwitch.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';
import { useUser } from 'src/stores/user'
import CashAddress from 'src/components/CashAddress.vue'
import getAppEnv from 'src/app/utils/getAppEnv'
export default defineComponent({
  name: 'MainLayout',
  components: {
    SidebarMenu,
    LightSwitch,
    PaytacaConnect,
    CashAddress
  },

  setup() {
    const leftDrawerOpen = ref(false)
    const user = useUser()
    return {
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      user,
      getAppEnv
    }
  }
});
</script>
