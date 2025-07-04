<template>
  <q-page class="q-pa-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-10 col-lg-9">
        <div class="row justify-center q-my-lg">
          <template v-if="!genesisInputUtxo || !authKey">
            <q-banner class="q-mt-lg q-px-lg q-py-xl text-justify"
              :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-3'" rounded>
              <div class="row justify-center q-mb-md">
                <q-icon name="info" size="lg" color="info" />
              </div>
              <p>
                Creating a new token requires a "genesis input". A valid genesis input is just a utxo that is the
                first
                output(v-out 0) of a previous transaction.
              </p>
              <p>
                Currently <span class="text-negative"> your wallet have {{ user.genesisInputs?.length }}</span> utxo
                that
                we can use as genesis input. This
                operation <span class="text-positive">requires 2</span> genesis input
                (1 for your token, 1 for an AuthKey token). You can create a genesis input by clicking the button below.
                If you want to use an existing AuthKey <q-btn to="/issuer/manage/authkeys" flat color="secondary" dense
                  no-caps class="q-pl-0" label="Click Here" style="text-indent:0px !important" />
              </p>
              <template v-slot:action>
                <BusyButton :busy-label="genesisInputInstance?.processing" label="Generate genesis input"
                  @click="generateGenesisInputs" color="primary" />
              </template>
            </q-banner>
          </template>
          <template v-else>
            <TokenGenesisForm :token-type="(route.params.tokenType as ('ft' | 'nft' | 'fnft'))"
              :genesis-input="genesisInputUtxo" :auth-key="authKey" :owner-wallet="(user.wallet! as Wallet)"
              :create-auth-key="true" @genesis-result="onGenesisResult" />
          </template>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">

import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { UtxoI, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { GenesisInput, AuthKey, DEFAULT_TOKEN_VALUE } from 'src/apps'
import TokenGenesisForm from 'src/components/forms/TokenGenesisForm.vue'
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { useWalletConnect } from 'src/composables/useWalletConnect';
import { usePaytacaConnect } from 'src/composables/usePaytacaConnect';
import { TransactionSigner } from 'src/apps/types';

const $q = useQuasar()
const user = useUser()
const ui = useUI()
const route = useRoute()
const { $ebus } = useEventBus()
const authKey = ref<AuthKey | null>()
const genesisInputUtxo = ref<UtxoI | null>()
const genesisInputInstance = ref<GenesisInput>()
const genesisInputScanDone = ref<boolean>(false)
const walletConnect = useWalletConnect()
const paytacaConnect = usePaytacaConnect()

const generateGenesisInputs = async () => {
  if (!user.wallet || !user.walletType) {
    $q.notify({ type: 'negative', message: 'Wallet not connected' })
    return
  }

  const transactionSigner: TransactionSigner = user.walletType === 'paytaca' ? paytacaConnect.paytacaTransactionSigner : walletConnect.walletConnectTransactionSigner

  try {
    genesisInputInstance.value = new GenesisInput({ vout: 0, satoshis: 0, txid: '' }, transactionSigner) // 
    const tx = await genesisInputInstance.value.generate(user.wallet! as Wallet, 2)
    if (tx) {
      $q.notify({ type: 'positive', message: 'Genesis inputs created' })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'GenesisInput.generate',
        timestamp: new Date().getTime(),
        successMsg: 'Generated genesis input(v-out 0 utxo)'
      })
    }
  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error'
    })
    $q.notify({ type: 'negative', message: 'Error creating genesis inputs' })
  }

}

const onGenesisResult = async (result: any) => {
  console.log('GENESIS RESULT', result)
}

const filterAndStoreGenesisInputs = (userUtxos: UtxoI[]) => {
  user.genesisInputs = userUtxos?.filter((utxo: UtxoI) => {
    return Boolean(!utxo.token) &&
      utxo.vout === 0 &&
      utxo.satoshis >= DEFAULT_TOKEN_VALUE
  }).slice(0, 5)
}

watch(() => user.genesisInputs, (value) => {
  genesisInputScanDone.value = true
  if (value && value.length >= 2) {
    // use first for AuthKey
    genesisInputUtxo.value = value[0]
    authKey.value = new AuthKey({ ...value[1] })
  }
  if (!value || value.length === 0) {
    genesisInputUtxo.value = null
    authKey.value = null
  }
})

watch(() => user.wallet, async (userWallet) => {
  if (userWallet) {
    ui.setStatusMessage({
      statusMessage: 'Scanning your wallet for valid genesis inputs',
      statusMessageType: undefined,
      statusMessageSpinner: true
    })
    const userUtxos = await userWallet.getAddressUtxos()
    ui.clearStatusMessage()
    filterAndStoreGenesisInputs(userUtxos)
  }
})

onMounted(async () => {
  if (user.genesisInputs && user.genesisInputs?.length >= 2) {
    genesisInputUtxo.value = user.genesisInputs[0]
    authKey.value = new AuthKey({ ...user.genesisInputs[1] })
  }
})


</script>
