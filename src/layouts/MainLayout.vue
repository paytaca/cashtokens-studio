<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Cashtokens Studio
        </q-toolbar-title>

        <!-- <div>v0.1.0</div> -->
        <light-switch />
        <paytaca-connect />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label
          header
        >
          {{ user.connectedPaytacaAddress }}
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
      <div id="status-bar" class="q-ma-sm q-pa-sm full-width row inline no-wrap justify-start items-center content-start" align="right">
        <q-spinner-pie v-if="ui.isBusy" size="md" color="deep-purple" />
        <div v-if="ui.message?.text != ''" class="q-ml-md"><i>{{ ui.message.text }}</i></div>
      </div>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useUserStore } from 'stores/user';
import { useUIStore } from 'stores/ui';
// import EssentialLink from 'components/EssentialLink.vue';
import SidebarMenu from 'components/SidebarMenu.vue';
import LightSwitch from 'components/LightSwitch.vue';
import PaytacaConnect from 'components/PaytacaConnect.vue';

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
    SidebarMenu,
    // EssentialLink,
    LightSwitch,
    PaytacaConnect
  },

  setup () {
    const leftDrawerOpen = ref(false)
    const user = useUserStore()
    const ui = useUIStore()
    return {
      ui,
      essentialLinks: links,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      user
    }
  },
  watch: {
    'ui.message.text'(messageText){
      if (messageText.length > 0) {
        window.scrollTo({behavior:'smooth', top:0, left:0 })
      }
    }
  }
});
</script>
