<template>
  <div>
    <q-btn size="lg" flat @click="toggle" :icon="$q.dark.isActive ? 'dark_mode' : 'light_mode'"
      :color="$q.dark.isActive ? 'grey-7' : 'yellow'">
    </q-btn>
  </div>
</template>
<script lang="ts">

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LightSwitch',
  methods: {
    toggle() {
      this.$q.dark.toggle()
    }
  }
})
</script>
