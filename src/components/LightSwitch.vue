<template>
  <div>
    <button @click="toggle">Toggle</button>
  </div>
</template>
<script lang="ts">
import { useQuasar } from 'quasar';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LightSwitch',
  setup(){
    const $q = useQuasar()
  },
  methods: {
    toggle(){
      this.$q.dark.toggle()
    }
  }
})
</script>