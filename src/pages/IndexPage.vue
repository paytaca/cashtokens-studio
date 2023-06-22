<template>
  <q-page class="row items-center justify-evenly">
    <div class="col">
      <div class="row items-center justify-evenly">
        Welcome to Cashtokens Studio
      </div>
      <div class="row items-center justify-evenly">
        <paytaca-connect />
      </div>
    </div>
    
    
  </q-page>
</template>

<script lang="ts">
import PaytacaConnect from 'components/PaytacaConnect.vue';
import { defineComponent, ref } from 'vue';

export default defineComponent({
    name: "IndexPage",
    components: { PaytacaConnect }
});
</script>
