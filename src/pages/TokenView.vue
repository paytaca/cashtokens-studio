<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <q-banner class="shadow-3" :class="!$q.dark.isActive ? 'bg-grey-5' : ''" style="border-radius: 1em;">
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
              <q-markup-table dense flat :class="!$q.dark.isActive ? 'bg-grey-5' : ''">
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
          <div>
            <q-btn id="authchain-action-buttons" icon="menu" size="md" round flat dense
              @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
              <q-menu>
                <q-list>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainRegistryPublisherDialog.__name, ui.tokenInView as AuthchainIdentity)">
                    Publish Registry From URL
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainRegistryFromFilePublisherDialog.__name, ui.tokenInView as AuthchainIdentity)">
                    Publish Registry From File
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(UnguardAuthchainDialog.__name, ui.tokenInView as AuthchainIdentity)">
                    Unguard Authchain
                  </q-item>
                  <q-item clickable v-close-popup
                    @click.stop="openDialog(AuthchainBurnerDialog.__name, ui.tokenInView as AuthchainIdentity)">
                    Burn Authchain
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
          <AuthchainRegistryPublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
          <AuthchainRegistryFromFilePublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryFromFilePublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" />
          <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-unguarded="onUnguard" />
          <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-burned="onBurn" />

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
import { onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui'
import TokenCategory from 'src/components/TokenCategory.vue';
import TokenSymbol from 'src/components/TokenSymbol.vue';
import { AuthchainIdentity, Bcmr, BcmrIndexer } from 'src/app';
import { Registry } from 'src/app/bcmr/bcmr-v2.schema';
import BcmrForm from 'src/components/forms/BcmrForm.vue'
import { useDialogs } from 'src/composables/useDialogs';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'

const ui = useUI()
const router = useRouter()
const bcmr = ref<Bcmr>()
const bcmrIndexer = reactive<BcmrIndexer>(new BcmrIndexer())
const { dialog, dialogData, openDialog, onHide } = useDialogs()

onMounted(async () => {
  if (ui.tokenInView?.token?.tokenId) {
    try {
      const bcmrContents: Registry | undefined = await bcmrIndexer.fetchBcmrContents(ui.tokenInView.token.tokenId)
      if (bcmrContents) {
        bcmr.value = new Bcmr(bcmrContents)
        bcmr.value.authchainIdentity = ui.tokenInView as AuthchainIdentity
      }
    } catch (error) {
      console.log('Error downloading bcmr contents')
    }

  }

})

const onUnguard = () => {
  console.log('Implement onUnguard')
}

const onBurn = () => {
  router.back()
}

</script>