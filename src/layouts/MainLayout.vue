<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="bg-teal-10 q-py-sm">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          <q-img v-if="route.path !== '/'" to="/" @click.stop="router.push('/')" src="images/cts_transparent.png"
            style="max-height: 3em;object-fit: fill;max-width:8em"></q-img>
          <code v-if="getAppEnv() !== 'production'" class="text-caption">[TEST MODE]</code>
        </q-toolbar-title>
        <light-switch />
        <paytaca-connect />
      </q-toolbar>
    </q-header>
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
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
      <q-page-container class="q-mb-lg">
        <router-view />
        <!-- <q-inner-loading :showing="ui.pageLoader.show" :label="ui.pageLoader.label" label-class="text-teal"
          label-style="font-size: 1.1em" /> -->
      </q-page-container>
      <q-footer class="text-grey text-right q-px-md q-pb-sm text-italic" reveal style="background-color: unset;">
        <template v-if="ui.statusMessage">
          <span class="q-mr-sm">{{ ui.statusMessage }}</span><q-spinner-dots></q-spinner-dots>
        </template>
      </q-footer>
    </q-scroll-area>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import SidebarMenu from 'components/SidebarMenu.vue';
import LightSwitch from 'components/LightSwitch.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';
import { useUser } from 'src/stores/user'
import { useUI } from 'src/stores/ui';
import CashAddress from 'src/components/CashAddress.vue'
import getAppEnv from 'src/app/utils/getAppEnv'
import { useRoute, useRouter } from 'vue-router'
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
    const ui = useUI()
    const route = useRoute()
    const router = useRouter()
    return {
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      user,
      ui,
      getAppEnv,
      route,
      router
    }
  }
});
</script>
