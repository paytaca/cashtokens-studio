<template>
  <q-page class="q-pa-md q-ma-sm" style="min-height: 100vh">
    <div>
      <div class="text-h6 q-mb-md">Create New Fungible Token</div>
      <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify">
        <q-tab name="token" label="Token Details" />
        <q-tab v-if="bcmr.$schema" name="bcmr" label="BCMR" :disable="!includeBcmrOpReturn" />
      </q-tabs>
      <q-separator />
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="token">
          <div class="row q-my-lg">
            <div class="col">
              <q-select dark:color="lime" :filled="true" standout bottom-slots v-model="token.tokenId"
                :options="tokenIdOptions" label=" Token tokenId" clearable>
                <template v-slot:prepend>
                  <q-icon name="abc" />
                </template>
                <template v-slot:hint>
                  <i>Select suitable TX id from your utxos</i>
                </template>
                <q-inner-loading :showing="isPopulatingTokenIdOptions">
                  <q-spinner-facebook size="sm" color="primary" />
                </q-inner-loading>
              </q-select>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" dark:color="lime" v-model="token.creatorAddress"
                label="Creator's address"></q-input>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-checkbox :filled="true" dark:color="lime" v-model="includeBcmrOpReturn"
                label="Include BCMR publication output">
              </q-checkbox>
            </div>
          </div>
          <div v-if="includeBcmrOpReturn" class="row q-my-lg">
            <div class="col">
              <div class="row">
                <div class="col">
                  <q-input :filled="true" dark:color="lime" v-model="token.bcmrUrl" label="BCMR Url"></q-input>
                </div>
              </div>
              <div class="row justify-end">
                <div class="col-12 text-right q-gutter-sm q-pt-xs">
                  <q-btn color="primary" size="sm" @click="fetchBcmr">Fetch</q-btn>
                  <q-btn color="primary" size="sm" @click="createNewBcmr">Create New</q-btn>
                </div>
              </div>
            </div>
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-btn color="primary" size="md" @click.stop="createFT">Create Token Genesis</q-btn>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="bcmr">
          <div class="text-h5 q-mb-md">BCMR</div>
          <JsonEditor v-model="bcmr" :darkTheme="$q.dark.isActive" />
        </q-tab-panel>
      </q-tab-panels>
    </div>
    <q-dialog v-model="openNewBcmrDialog">
      <TokenBcmrBasicForm token-type="ft" :tokenId-options="tokenIdOptions" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { sha256, utf8ToBin, decodeTransaction } from '@bitauth/libauth';
import { hexToBin, BCMR, OpReturnData, SendRequest, TokenSendRequest, UnitEnum, } from 'mainnet-js'
import JsonEditor from 'vue3-ts-jsoneditor'
import { ref, watch, onMounted } from 'vue'
import { UtxoI } from 'mainnet-js'

import { Registry as BcmrRegistry } from 'src/interfaces/bcmr-v2.schema';
import getWalletClass from 'src/utils/getWalletClass';
import { useUserStore } from 'src/stores/user';
import bcmrTemplate from 'src/resources/bcmr';
import { useUIStore } from 'src/stores/ui';
import TokenBcmrBasicForm from 'components/TokenBcmrBasicForm.vue'
import getByteCount from 'src/utils/getByteCount';
import AuthChainGuard from 'src/classes/AuthChainGuard';

defineOptions({ name: 'NewFt' })

const user = useUserStore()
const ui = useUIStore()
const feeEstimate = ref<number>(Math.floor(Number(getByteCount({ P2PKH: 1 }, { P2PKH: 2, P2SH: 1 })) * 1.1))

const token = ref<{
  creatorAddress: string,
  name: string,
  symbol: string,
  tokenId: string,
  maxSupply: string,
  bcmrUrl: string
}>({
  creatorAddress: '',
  name: '',
  symbol: '',
  tokenId: '',
  maxSupply: '100000000000000000', //arbitrary value
  bcmrUrl: bcmrTemplate.registryIdentity.uris.registry
})

const includeBcmrOpReturn = ref(false)
const openNewBcmrDialog = ref(false)
const tokenIdOptions = ref<Array<string>>([])
const isPopulatingTokenIdOptions = ref(false)
const tab = ref('token')
const bcmr = ref<BcmrRegistry>(bcmrTemplate)

watch(() => user.connectedPaytacaAddress, async (address: string) => {
  token.value.creatorAddress = address
  if (address) {
    isPopulatingTokenIdOptions.value = true
    const WalletClass = getWalletClass()
    const wallet = await WalletClass.watchOnly(address)
    const txIds = (await wallet.getAddressUtxos()).filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0);
    tokenIdOptions.value = txIds.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
    isPopulatingTokenIdOptions.value = false
  } else {
    tokenIdOptions.value = []
  }
})

onMounted(async () => {
  if (user.connectedPaytacaAddress) {
    token.value.creatorAddress = user.connectedPaytacaAddress
    isPopulatingTokenIdOptions.value = true
    const WalletClass = getWalletClass()
    const wallet = await WalletClass.watchOnly(user.connectedPaytacaAddress)
    const txIds = (await wallet.getAddressUtxos()).filter((utxo: UtxoI) => !utxo.token && utxo.vout === 0 && utxo.satoshis > (feeEstimate.value + 1000 + 1000 + 1000));
    tokenIdOptions.value = txIds.map((utxo: UtxoI) => utxo.txid).slice(0, 9)
    isPopulatingTokenIdOptions.value = false
  }
})

// methods
const createFT = async () => {
  const ui = useUIStore()
  ui.busy({ text: 'Creating FT', type: 'info' })
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(user.connectedPaytacaAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)

  if (token.value.creatorAddress) {
    const WalletClass = getWalletClass()
    const wallet = await WalletClass.watchOnly(token.value.creatorAddress)
    const authbaseAndTokenGenesisInput = (await wallet.getAddressUtxos()).filter((val: UtxoI) => !val.token && val.vout === 0 && val.txid === token.value.tokenId)[0];

    let txSigningResult;
    try {
      /* Locking authchain to the AuthchainGuard, TODO: Make this optional, allow sending to P2PKH address*/
      const authChainGuard = new AuthChainGuard(user.connectedPaytacaAddress, creatorWalletPkh, creatorWallet.network)

      const contract = authChainGuard.contract
      const tokenGenesisRequest: (SendRequest | TokenSendRequest | OpReturnData)[] = [
        new SendRequest({ cashaddr: contract.getDepositAddress(), value: 1000 /**/, unit: UnitEnum.SATOSHIS }),
        new TokenSendRequest({ cashaddr: wallet.getTokenDepositAddress(), value: 1000, amount: Number(token.value.maxSupply), tokenId: token.value.tokenId }),
      ]

      if (includeBcmrOpReturn.value === true) {
        let contentHash = sha256.hash(utf8ToBin(JSON.stringify(bcmr)));
        tokenGenesisRequest.push(OpReturnData.fromArray(['BCMR', contentHash, token.value.bcmrUrl.replace('https://', '')]))
      }

      const { encodedTransaction, sourceOutputs } = await wallet.encodeTransaction(tokenGenesisRequest,
        false,
        { tokenOperation: 'genesis', checkTokenQuantities: false, buildUnsigned: true, utxoIds: [authbaseAndTokenGenesisInput], ensureUtxos: [authbaseAndTokenGenesisInput] }
      )

      let decoded = decodeTransaction(encodedTransaction)
      if (typeof decoded === 'string') {
        ui.setMessage({ type: 'error', text: 'decoded' })
        return;
      }

      ui.busy({ type: 'info', text: 'Waiting for FT creator\'s signature' })

      txSigningResult = await window.paytaca.signTransaction({
        transaction: decoded, sourceOutputs: [...sourceOutputs], broadcast: false, userPrompt: 'Create Token Genesis'
      })

      if (!txSigningResult) {
        ui.idle()
        ui.clearMessage()
        return
      }

    } catch (error) {
      if (error instanceof Error) {
        console.log(error)
        ui.setMessage({ type: 'error', text: 'Error creating FT Token' })
      }
      return
    }

    // Tx signing success, submitting transaction
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tx = await wallet.submitTransaction(hexToBin(txSigningResult!.signedTransaction), true);
      ui.idle()
      ui.setMessage({ text: `Success! FT Created Tx = ${tx}`, type: 'success', timeout: 5 })

      await BCMR.buildAuthChain({ transactionHash: token.value.tokenId, network: wallet.network })

    } catch (error) {
      console.log('Error creating FT Token during submission of txn', error)
      return
    }
  }
}

const fetchBcmr = async () => {
  try {
    ui.busy({ text: `Fetching BCMR from ${token.value.bcmrUrl}`, type: 'info' })
    const r = await fetch(token.value.bcmrUrl)
    bcmr.value = await r.json()
    token.value.tokenId = Object.keys(bcmr.value?.identities as { o: object })[0]
    tokenIdOptions.value = Object.keys(bcmr.value?.identities as { o: object })
    ui.idle()
    ui.setMessage({ text: 'BCMR download success, check the BCMR Tab', type: 'success', timeout: 5 })
  } catch (error) {
    ui.idle()
    ui.setMessage({ text: 'Failed to fetch BCMR, make sure the URL is correct', type: 'error', timeout: 5 })
    console.log(error)
  }
}

const createNewBcmr = () => {
  openNewBcmrDialog.value = true
  initBcmr()
}

const initBcmr = () => {
  bcmr.value = bcmrTemplate
}

</script>

