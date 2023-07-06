<template>
  <q-layout view="lHh Lpr lFf">
    <HeadLess />
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          Cashtokens Studio
        </q-toolbar-title>

        <!-- <div>v0.1.0</div> -->
        <light-switch />
        <paytaca-connect />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header class="q-mx-sm">
          <div style="position: relative">
            <svg class="svg" viewBox="0 0 100 100" width="150">
              <defs>
                <path id="circle" d="
                      M 50, 50
                      m -37, 0
                      a 37,37 0 1,1 74,0
                      a 37,37 0 1,1 -74,0" />
              </defs>
              <text font-size="12" style="transform: rotate(-55deg);transform-origin: center; fill:white;">
                <textPath xlink:href="#circle">
                  {{ user.connectedPaytacaAddress }}
                </textPath>
              </text>

            </svg>
            <!-- <image href="https://bitcatsheroes.club/img/logo.png" height="65" width="65"
              style="position:absolute; top: 35; left: 50; z-index: ;" /> -->
          </div>

        </q-item-label>

        <!-- <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        /> -->
        <SidebarMenu />
      </q-list>
    </q-drawer>

    <q-page-container>
      <!-- <div id="status-bar" class="q-ma-sm q-pa-sm full-width row inline no-wrap justify-start items-center content-start" align="right">
        <q-spinner-pie v-if="ui.isBusy" size="md" color="deep-purple" />
        <div v-if="ui.message?.text != ''" class="q-ml-md"><i>{{ ui.message.text }}</i></div>
      </div> -->
      <StatusBar />
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useUserStore } from 'stores/user';
import { useUIStore } from 'stores/ui';
import SidebarMenu from 'components/SidebarMenu.vue';
import StatusBar from 'components/StatusBar.vue';
import LightSwitch from 'components/LightSwitch.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';
import HeadLess from 'components/HeadLess.vue';

const links = [
  {
    title: 'New Fungible Token',
    caption: 'Create new fungible token',
    icon: 'add',
    link: '/ft/create'
  },
  {
    title: 'New Non Fungible Token',
    caption: 'Create new non-fungible token',
    icon: 'add',
    link: '/nft/create'
  },
  {
    title: 'New Fungible Token',
    caption: 'New fungible token',
    icon: 'add',
    link: '/ft/new'
  }
];

export default defineComponent({
  name: 'MainLayout',

  components: {
    HeadLess,
    SidebarMenu,
    LightSwitch,
    PaytacaConnect,
    StatusBar,

  },

  setup() {
    const leftDrawerOpen = ref(false)
    const user = useUserStore()
    const ui = useUIStore()
    return {
      ui,
      essentialLinks: links,
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      user
    }
  }
});
</script>
