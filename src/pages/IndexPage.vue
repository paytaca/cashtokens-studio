<template>
  <q-page class="row items-center justify-evenly">
    <div class="col">
      <div class="row items-center justify-evenly text-h3">
        Welcome to CashTokens Studio
      </div>
      <div class="row items-center justify-evenly">
        <paytaca-connect />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import PaytacaConnect from 'components/PaytacaConnect.vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: "IndexPage",
  components: { PaytacaConnect }
});
</script>
