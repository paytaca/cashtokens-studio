<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <q-banner rounded :class="!$q.dark.isActive ? 'bg-grey-3' : ''">
          <div class="row q-px-md q-py-md flex justify-center">
            <div class="col-xs-12 col-sm-3 text-center q-gutter-sm">
              <div>
                <q-avatar size="8em">
                  <img v-if="ui.tokenInView?.tokenUris?.icon" :src="ui.tokenInView?.tokenUris?.icon" alt="">
                  <q-icon v-else name="token" color="grey-8"></q-icon>
                </q-avatar>
              </div>
            </div>
            <div class="col-xs-10 col-sm-9 justify-left">
              <q-markup-table dense flat :class="!$q.dark.isActive ? 'bg-grey-3' : ''">
                <tbody>
                  <tr>
                    <td class="text-bold">Category</td>
                    <td>
                      <TokenCategory :token-id="ui.tokenInView?.token?.tokenId" />
                    </td>
                  </tr>
                  <tr>
                    <td class="text-bold">Symbol</td>
                    <td>
                      <TokenSymbol v-if="ui.tokenInView?.tokenCategory?.symbol"
                        :symbol="ui.tokenInView?.tokenCategory?.symbol" />
                    </td>
                  </tr>
                  <tr v-if="ui.tokenInView?.token?.amount">
                    <td class="text-bold">Fungible Amount</td>
                    <td>{{ ui.tokenInView?.token?.amount }}</td>
                  </tr>
                  <tr v-if="ui.tokenInView?.tokenCategory?.decimals">
                    <td class="text-bold">Decimals</td>
                    <td>{{ ui.tokenInView?.tokenCategory?.decimals }}</td>
                  </tr>
                  <tr v-if="ui.tokenInView?.token?.capability">
                    <td class="text-bold">Capability</td>
                    <td>
                      <code>{{ ui.tokenInView?.token?.capability }}</code>
                    </td>
                  </tr>
                </tbody>
              </q-markup-table>
            </div>
          </div>
        </q-banner>
      </div>
      <div class="col-xs-12 col-md-10 q-py-md">
        <div v-if="bcmrIndexer.processing" class="row justify-center">
          <q-spinner-grid class="col-2" size="xl" color="primary" />
          <span class="col-12 text-center">
            {{ bcmrIndexer.processing }}
          </span>
        </div>
        <BcmrForm v-if="bcmr" :registry="bcmr" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { onMounted, ref, reactive } from 'vue';
import { useUI } from 'src/stores/ui'
import TokenCategory from 'src/components/TokenCategory.vue';
import TokenSymbol from 'src/components/TokenSymbol.vue';
import { Bcmr, BcmrIndexer } from 'src/app';
import { Registry } from 'src/app/bcmr/bcmr-v2.schema';
import BcmrForm from 'src/components/forms/BcmrForm.vue'

const ui = useUI()
const route = useRoute()
const bcmr = ref<Bcmr>()
const bcmrIndexer = reactive<BcmrIndexer>(new BcmrIndexer())

onMounted(async () => {
  if (ui.tokenInView?.token?.tokenId) {
    try {
      const bcmrContents: Registry | undefined = await bcmrIndexer.fetchBcmrContents(ui.tokenInView.token.tokenId)
      if (bcmrContents) {
        bcmr.value = new Bcmr(bcmrContents)
      }
    } catch (error) {
      console.log('Error downloading bcmr contents')
    }

  }

})

</script>