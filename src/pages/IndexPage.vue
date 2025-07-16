<template>
  <q-page class="row justify-evenly" :class="!user.walletAddress ? 'items-center' : ''">
    <div v-if="user.walletAddress" class="col-12 q-gutter-sm q-my-sm self-start text-right">
      <q-btn text-color="text-grey-8" size="lg" no-caps :to="{ name: 'my-fts' }">
        <div>
          <q-icon name="money" color="warning" />
          <div>My FTs</div>
        </div>
      </q-btn>
      <q-btn text-color="text-grey-8" size="lg" no-caps :to="{ name: 'my-nfts' }">
        <div>
          <div><q-icon name="art_track" color="warning" /></div>
          <div>My NFTs</div>
        </div>
      </q-btn>
    </div>
    <div class="col-12">
      <div class="row items-center justify-evenly text-h5">
        <q-img src="images/cts_transparent.png" :style="bannerSize" />
      </div>
      <div v-if="!user.walletAddress" class="row justify-center items-center q-px-lg q-pt-lg">
        <q-list bordered separator>
          <!-- <q-item v-if="!isMobileBrowser" class="col-xs-12 text-center" clickable v-ripple>
            <q-item-section>
              <paytaca-connect size="3em" />
            </q-item-section>
          </q-item> -->
          <q-item class="col-xs-12 text-center" clickable v-ripple>
            <q-item-section>
              <WalletConnect size="3em" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import WalletConnect from 'components/WalletConnect.vue';
import { delay } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import { computed, onMounted, ref } from 'vue';
const $q = useQuasar()
const user = useUser()
const isMobileBrowser = ref<boolean>(false)

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

onMounted(async () => {
  await delay(100)
  isMobileBrowser.value = /Mobi/.test(navigator?.userAgent)
})
</script>
