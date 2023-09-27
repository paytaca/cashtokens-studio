<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <q-banner rounded :class="!$q.dark.isActive ? 'bg-grey-3' : ''">
          <div class="row q-px-lg q-py-lg flex justify-center">
            <div class="col-xs-12 text-center q-gutter-sm">
              <div>
                <q-avatar class="q-col-xs-10">
                  <img v-if="ui.tokenInView?.tokenUris?.icon" :src="ui.tokenInView?.tokenUris?.icon" alt="">
                </q-avatar>
              </div>
              <div>
                <TokenSymbol v-if="ui.tokenInView?.tokenCategory?.symbol"
                  :symbol="ui.tokenInView?.tokenCategory?.symbol" />
              </div>
            </div>
            <div class="col-xs-10 flex justify-left">
              <TokenCategory :token-id="ui.tokenInView?.token?.tokenId" />
              <div>{{ ui.tokenInView?.token?.amount }}</div>
            </div>
          </div>

        </q-banner>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useUI } from 'src/stores/ui'
import TokenCategory from 'src/components/TokenCategory.vue';
import TokenSymbol from 'src/components/TokenSymbol.vue';

const route = useRoute()
const ui = useUI()


</script>