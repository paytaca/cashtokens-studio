<template>
  <q-page class="row items-center justify-evenly">
    <div class="col">
      <div class="row items-center justify-evenly text-h5">
        <q-img src="images/cts_transparent.png" :style="bannerSize" />
      </div>
      <div v-if="!user.walletAddress" class="row justify-center items-center q-px-lg q-pt-lg">
        <q-list bordered separator>
          <q-item class="col-xs-12 text-center" clickable v-ripple>
            <q-item-section>
              <paytaca-connect size="3em" />
            </q-item-section>
          </q-item>
          <q-item class="col-xs-12 text-center" clickable v-ripple>
            <q-item-section>
              <wallet-connect size="3em" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import PaytacaConnect from 'components/PaytacaConnect.vue';
import WalletConnect from 'components/WalletConnect.vue';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import { computed } from 'vue';
const $q = useQuasar()
const user = useUser()

const bannerSize = computed(() => {
  const size = { width: '400px' }
  if (!$q.screen.lt.lg) {
    return { width: '800px' }
  }
  if (!$q.screen.lt.md) {
    return { width: '600px' }
  }
  if (!$q.screen.lt.sm) {
    return { width: '400px' }
  }

  return size
})
</script>
