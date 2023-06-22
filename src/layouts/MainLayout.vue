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

        <div>v0.1.0</div>
        <light-switch />
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

        <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useUserStore } from 'stores/user';
import EssentialLink from 'components/EssentialLink.vue';
import LightSwitch from 'components/LightSwitch.vue';

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
  }
];

export default defineComponent({
  name: 'MainLayout',

  components: {
    EssentialLink,
    LightSwitch
  },

  setup () {
    const leftDrawerOpen = ref(false)
    const user = useUserStore()
    return {
      essentialLinks: links,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      user
    }
  }
});
</script>
