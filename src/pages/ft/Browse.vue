<template>
  <q-page>
    <div class="row justify-left q-gutter-md q-ma-md">
      <q-card v-for="ft, i in createdFtsComputed" :key="i" class="token-card col-xs-12 col-sm-6 col-md-4 col-lg-2">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span><strong>Token </strong></span>{{ i }}</q-toolbar-title>
        </q-toolbar>
        <q-card-section>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Id: </span>
            <span class="token-id text-weight-thin">{{
              ft.token?.tokenId.replace(ft.token?.tokenId.substring(8, ft.token?.tokenId.length - 4), '...') }}
            </span>
          </div>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Amount: </span><span>{{ ft.token?.amount }}</span>
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn color="primary"
            @click="$router.push(`/ft/view?tokenId=${ft.token!.tokenId}&creator=${user.connectedPaytacaAddress}`)">View
            Details</q-btn>
        </q-card-actions>
      </q-card>
      <!-- {{createdFts}} -->
    </div>
  </q-page>
</template>
<style scoped lang="scss">
.token-id {
  background-color: $grey-10;
  border-radius: 25px;
  padding: .5em;
}

.token-card {
  max-width: 20em;
}
</style>
<script setup lang="ts">

import { ref, onMounted, watch, computed } from 'vue'
// import { sha256, utf8ToBin } from '@bitauth/libauth';
// import { hexToBin, OpReturnData } from 'mainnet-js'
// import JsonEditor from 'vue3-ts-jsoneditor'
import { UtxoI, BCMR } from 'mainnet-js'

// import { Registry as BcmrRegistry} from 'src/interfaces/bcmr-v2.schema';
import getWalletClass from 'src/utils/getWalletClass';
import { useUserStore } from 'src/stores/user';
// import bcmrTemplate from 'src/resources/bcmr';
// import { useUIStore } from 'src/stores/ui';
// import TokenBcmrBasicForm from 'components/TokenBcmrBasicForm.vue'
import createAuthChainGuardContract from 'src/utils/createAuthChainGuardContract';
import { useUIStore } from 'src/stores/ui';

defineOptions({ name: 'BrowseFt' })

const user = useUserStore()
const ui = useUIStore()
const createdFts = ref([] as UtxoI[])
const createdFtsComputed = computed<UtxoI[]>(() => {
  return createdFts.value
})

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address.length > 0) {
    loadCreatedFts(address)
  } else {
    createdFts.value = [] as UtxoI[]
  }
})

onMounted(async () => {
  if (user.connectedPaytacaAddress) {
    ui.busy({ type: 'info', text: 'Loading manageable FTs' })
    loadCreatedFts(user.connectedPaytacaAddress)
  }
})

// methods
const loadCreatedFts = async (creatorAddress: string) => {
  ui.busy({ type: 'info', text: 'Loading connected wallet\'s manageable FTs' })
  const WalletClass = getWalletClass()
  const creatorWallet = await WalletClass.watchOnly(creatorAddress)
  const creatorWalletPkh = creatorWallet.getPublicKeyHash(false)

  const authchainGuardContract = createAuthChainGuardContract({
    ownerPubKey: creatorWalletPkh,
    network: creatorWallet.network,
  })

  const autchainGuardWallet = await WalletClass.watchOnly(authchainGuardContract.getDepositAddress())

  creatorWallet.getTokenDepositAddress()
  // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain, @typescript-eslint/no-non-null-assertion
  const creatorFts = (await creatorWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(utxo.token) && utxo.token?.amount! > 0)
  const authchainIdentityOutputs = (await autchainGuardWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token))

  let creatorFtsTokenIdsSet = new Set(creatorFts.map((utxo: UtxoI) => utxo.token?.tokenId))
  let authchainIdentityOutputsSet = new Set(authchainIdentityOutputs.map((utxo: UtxoI) => utxo.txid))
  let ftsLoaded = new Promise((res) => {
    let counter = 0
    creatorFtsTokenIdsSet.forEach(async (tokenId) => {
      const response = await fetch(
        'https://gql.chaingraph.pat.mn/v1/graphql',
        {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            operationName: null,
            variables: {},
            // eslint-disable-next-line quotes
            /* chaingraph authhead query*/
            // eslint-disable-next-line quotes
            query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},node_validation_timeline:{node:{name:{_ilike:\"%chipnet%\"}}}}){hash authchains{authchain_length migrations(where:{transaction:{outputs:{locking_bytecode_pattern:{_like:\"6a04%\"}}}},order_by:{migration_index:desc}limit:1){transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{locking_bytecode_pattern:{_like:\"6a04%\"}}){output_index locking_bytecode}}}}}}`
          })
        })

      let responseJson = await response.json()

      if (responseJson) {
        const thisTokenIdsAuthChain = responseJson.data?.transaction?.find((tx: any) => tx.hash.toString().replace('\\x', '') === tokenId)
        console.log('authchain', thisTokenIdsAuthChain)
        if (thisTokenIdsAuthChain) {
          let authchain = thisTokenIdsAuthChain.authchains[0]
          let authhead
          if (authchain.migrations && authchain.migrations[0]) {
            authhead = authchain.migrations[0]
            // if the tx of this authhead is in our authchain guards utxo set we can manage it
            let copy = new Set(authchainIdentityOutputsSet)
            copy.add(authhead.transaction[0]?.hash?.replace('\\x', ''))
            if (copy.size === authchainIdentityOutputsSet.size) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              let created = creatorFts.find((utxo: UtxoI) => utxo.token!.tokenId === tokenId)
              if (created) {
                createdFts.value.push(created)
              }
            }
          }
        }
      }
      counter++
      if (counter >= creatorFtsTokenIdsSet.size) {
        res(true)
      }
    })
  })

  await ftsLoaded
  ui.idle()

}

</script>
