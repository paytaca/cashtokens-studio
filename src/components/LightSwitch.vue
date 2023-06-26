<template>
  <div>
    <q-btn size="md" flat @click="toggle" :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"></q-btn>
  </div>
</template>
<script lang="ts">
import { useQuasar } from 'quasar';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LightSwitch',
  methods: {
    toggle(){
      this.$q.dark.toggle()
    }
  }
})
</script>