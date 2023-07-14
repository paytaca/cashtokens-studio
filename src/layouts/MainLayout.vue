<template>
  <q-layout view="lHh Lpr lFf">
    <HeadLess />
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          Cashtokens Studio
        </q-toolbar-title>
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
          </div>
        </q-item-label>
        <SidebarMenu />
      </q-list>
    </q-drawer>

    <q-page-container>
      <StatusBar />
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
