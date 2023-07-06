<template>
  <div class="row justify-around q-ma-md">
    <q-card v-for="ft, i in createdFts" :key="i" class="col-auto"
      @click="$router.push(`/ft/view?tokenId=${ft.token!.tokenId}&creator=${user.connectedPaytacaAddress}`)">
      <div class="text-h6">Token {{ i }}</div>
      <q-avatar>
        <img src="https://chipnet.imaginary.cash/img/logo/bch.svg">
      </q-avatar>
      <div>{{ ft.token?.tokenId }}</div>
      <div>{{ ft.token?.amount }}</div>
      <div>
        <q-btn>Update BCMR</q-btn>
      </div>
    </q-card>
    <!-- {{createdFts}} -->
  </div>
</template>
<script setup lang="ts">

import { ref, onMounted, watch } from 'vue'
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

defineOptions({ name: 'BrowseFt' })

const user = useUserStore()
const createdFts = ref([] as UtxoI[])

watch(() => user.connectedPaytacaAddress, async (address) => {
  if (address.length > 0) {
    loadCreatedFts(address)
  } else {
    createdFts.value = [] as UtxoI[]
  }
})

onMounted(async () => {
  if (user.connectedPaytacaAddress) {
    loadCreatedFts(user.connectedPaytacaAddress)
  }
})

// methods

const loadCreatedFts = async (creatorAddress: string) => {
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

  createdFts.value = creatorFts

  const authchainIdentityOutputs = (await autchainGuardWallet.getAddressUtxos()).filter((utxo: UtxoI) => Boolean(!utxo.token))

  let creatorFtsTokenIdsSet = new Set(creatorFts.map((utxo: UtxoI) => utxo.token?.tokenId))
  let authchainIdentityOutputsSet = new Set(authchainIdentityOutputs.map((utxo: UtxoI) => utxo.txid))
  // cross reference our authchainIdentityOutputsSet (txids) from the authheads of the authchains of each of our tokens

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
          query: `{transaction(where:{hash:{_eq:\"\\\\x${tokenId}\"},block_inclusions:{block:{accepted_by:{node:{name:{_ilike:\"%chipnet%\"}}}}}}){ hash authchains {authchain_length migrations{transaction{hash inputs(where:{outpoint_index:{_eq:\"0\"}}){outpoint_index}outputs(where:{transaction:{outputs:{nonfungible_token_commitment:{_neq:\"null\"}}}}){output_index nonfungible_token_commitment}}}}}}`
        })
      })
    let responseJson = await response.json()
    if (responseJson) {
      const thisTokenIdsAuthChain = responseJson.data?.transaction?.find((tx: any) => tx.hash.toString().replace('\\x', '') == tokenId)
      if (thisTokenIdsAuthChain) {
        let authchain = thisTokenIdsAuthChain.authchains[0]
        let authhead
        if (authchain.migrations) {
          authhead = authchain.migrations[authchain.migrations.length - 1]
          // if the tx of this authhead is in our authchain guards utxo set we can manage it
          let copy = new Set(authchainIdentityOutputsSet)
          copy.add(authhead.transaction[0]?.hash?.replace('\\x', ''))
          if (copy.size > authchainIdentityOutputsSet.size) {
            // authhead was not made by creatorWallet, so this tokenId is not manageable by creatorWallet
            return
          } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            let created = creatorFts.find((utxo: UtxoI) => utxo.token!.tokenId == tokenId)
            if (created) {
              createdFts.value.push(created)
            }
          }
        }

      }
    }
  })
}

</script>
