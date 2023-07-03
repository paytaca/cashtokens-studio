<template>
  <div id="status-bar" class="q-ma-sm q-pa-sm full-width row inline no-wrap justify-start items-center content-start" align="right">
    <q-spinner-pie v-if="ui.isBusy" size="md" color="deep-purple" />
    <div v-if="ui.message?.text != ''" class="q-ml-md"><i>{{ ui.message.text }}</i></div>
  </div>
</template>
<script lang="ts">
import { useUIStore } from 'stores/ui';
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'StatusBar',
  setup () {
    const ui = useUIStore()
    return {
      ui,
    }
  },
  watch: {
    'ui.message.text'(messageText:string){
      if (messageText.length > 0) {
        window.scrollTo({behavior:'smooth', top:0, left:0 })
      }
      const ui = this.ui
      if (ui.message.timeout) {
        setTimeout(() => {
          ui.clearMessage()
        }, ui.message.timeout * 1000);
      }
    }
  }
})
</script>