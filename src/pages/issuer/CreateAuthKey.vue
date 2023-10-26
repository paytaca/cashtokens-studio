<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-center q-my-lg">
          <template v-if="!genesisInput">
            <q-banner class="q-mt-lg q-px-lg q-py-xl text-justify" :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'"
              rounded>
              <div class="row justify-center q-mb-md">
                <q-icon name="info" size="lg" color="info" />
              </div>
              <p>
                Creating a new AuthKey requires a "genesis input". A valid genesis input is just a utxo that is the
                first
                output(v-out 0) of a previous transaction.
              </p>
              <p>
                Currently <span class="text-negative"> your wallet have {{ user.genesisInputs?.length || 0 }}</span> utxo
                that
                we can use as genesis input. This
                operation <span class="text-positive">requires 1</span> genesis input. You can create a genesis input by
                clicking the button below.
              </p>
              <q-expansion-item label="What's an AuthKey?">
                <p>
                  When you create a new token (genesis) in CashTokens Studio it's locked in a contract called an
                  <q-btn href="https://github.com/mr-zwets/AuthGuard" target="_blank" color="secondary" flat dense
                    label="AuthGuard" no-caps style="text-indent:0" />.
                  An AuthKey is an NFT that let's the holder manage the locked tokens.
                  Holder of the AuthKey can manage the authchain, can publish registry updates, issue tokens from fungible
                  reserves or mint new NFTs
                  if the token created was a `minting` NFT.
                </p>
                <q-icon name="warning" color="warning"></q-icon>
                <p>
                  Don't send an AuthKey to anyone unless you intend to give them
                  permission to manage your tokens.
                </p>
              </q-expansion-item>
              <template v-slot:action>
                <BusyButton :busy-label="genesisInputInstance?.processing" label="Generate genesis input"
                  @click="generateGenesisInputs" color="primary" />
              </template>
            </q-banner>

          </template>

          <template v-else>
            <AuthKeyForm :genesis-input="genesisInput" :owner-wallet="(user.wallet as Wallet)"
              @auth-key-created="onCreateAuthKey" />
          </template>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { ref, watch, onMounted } from 'vue'
import { UtxoI, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { AuthKey, GenesisInput } from 'src/app'
import AuthKeyForm from 'src/components/forms/AuthKeyForm.vue'
import { useUI } from 'src/stores/ui';

const $q = useQuasar()
const user = useUser()
const ui = useUI()
const genesisInput = ref<UtxoI>()
const genesisInputInstance = ref<GenesisInput>()

watch(() => user.genesisInputs, (value) => {
  if (value && value.length >= 1) {
    // use first for AuthKey
    genesisInput.value = user.genesisInputs![0]
  }
})

onMounted(async () => {
  if (user.genesisInputs && user.genesisInputs?.length >= 1) {
    genesisInput.value = user.genesisInputs[0]
  }
})

const generateGenesisInputs = async () => {
  if (!user.wallet) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }
  try {
    genesisInputInstance.value = new GenesisInput({ vout: 0, satoshis: 0, txid: '' }) // 
    const tx = await genesisInputInstance.value.generate(user.wallet! as Wallet, 1)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
    }
  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error'
    })
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }
}

const onCreateAuthKey = () => {
  genesisInput.value = undefined
}
</script>

