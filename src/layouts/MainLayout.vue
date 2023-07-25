<template>
  <q-layout view="lHh Lpr lFf">
    <HeadLess />
    <q-header elevated>
      <q-toolbar class="bg-teal-10">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          Cashtokens Studio
        </q-toolbar-title>
        <light-switch />
        <paytaca-connect />
      </q-toolbar>
    </q-header>
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <div class="row justify-center q-gutter-sm q-pt-lg">
        <div class="col-12 text-center">
          <q-avatar>
            <q-img src="images/bch-logo.png"></q-img>
          </q-avatar>
        </div>
        <div class="col-12 text-center">
          <q-chip color="grey">
            {{ user.connectedPaytacaAddress?.replace(user.connectedPaytacaAddress.substring(11, 40), '...') }}
          </q-chip>
        </div>
      </div>
      <SidebarMenu />
    </q-drawer>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import SidebarMenu from 'components/SidebarMenu.vue';
import StatusBar from 'components/StatusBar.vue';
import LightSwitch from 'components/LightSwitch.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';
import HeadLess from 'components/HeadLess.vue';
import useStore from 'src/composables/useStore'

export default defineComponent({
  name: 'MainLayout',

  components: {
    HeadLess,
    SidebarMenu,
    LightSwitch,
    PaytacaConnect
  },

  setup() {
    const leftDrawerOpen = ref(false)
    const { user, ui } = useStore()
    return {
      ui,
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      user
    }
  }
});
</script>
