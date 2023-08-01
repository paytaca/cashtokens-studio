<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <q-page>
    <div class="row justify-left q-gutter-md q-ma-md">
      <q-dialog class="col-xs-12 row" v-model="options.issueTokens">
        <q-card class="q-pa-sm col-xs-12">
          <q-toolbar>
            <q-toolbar-title>
              Issue Tokens
            </q-toolbar-title>
            <q-btn size="sm" icon="close" dense flat @click="options.issueTokens = false"></q-btn>
          </q-toolbar>
          <q-card-section class="q-gutter-sm row">
            <q-input v-model="options.data.issueTokens.to" dense filled label="To"></q-input>
            <q-input v-model="options.data.issueTokens.amount" dense filled label="Amount"></q-input>
          </q-card-section>
          <q-card-actions class="">
            <q-btn dense flat @click="confirmTokenIssuance(options.data.issueTokens.tokenId)">Confirm</q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>
      <q-card v-for="ft, i in fungibles" :key="i" class="token-card col-xs-12 col-sm-4 col-md-4 col-lg-3">
        <q-toolbar>
          <q-icon name="token" size="md"></q-icon>
          <q-toolbar-title><span><strong>Token </strong></span>{{ i }}</q-toolbar-title>
          <q-btn icon="more_vert" size="md" round flat dense>
            <q-menu>
              <q-list>
                <q-item clickable v-close-popup
                  @click="() => { options.issueTokens = true; options.data.issueTokens.tokenId = ft.token.tokenId }">
                  Issue Tokens
                </q-item>
                <q-item clickable v-close-popup
                  @click="$router.push(`/token/view?tokenId=${ft.token!.tokenId}&creator=${user.connectedPaytacaAddress}`)">
                  Token Details
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </q-toolbar>
        <q-card-section>
          <div class="row justify-left items-center q-gutter-md">
            <span>Token Id: </span>
            <span class="token-id text-weight-thin">{{
              ft.token?.tokenId.replace(ft.token?.tokenId.substring(8, ft.token?.tokenId.length - 4), '...') }}
            </span>
          </div>
          <div class="row justify-left items-center q-gutter-md">
            <span>Amt: </span><span>{{ ft.token?.amount }}</span>
          </div>
          <div class="row justify-left items-center q-gutter-md">
            <span>Source: </span><span>{{ ft.source }}</span>
          </div>
        </q-card-section>
      </q-card>
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

import { ref, onMounted, computed, watch } from 'vue'
import { UtxoI } from 'mainnet-js'

import { useRouter } from 'vue-router'
import useStore from 'src/composables/useStore'
import MintingCovenant from 'src/contracts/MintingCovenant'
import getWalletClass from 'src/utils/getWalletClass'
import { Utxo } from 'cashscript'
import { useQuasar } from 'quasar'

defineOptions({ name: 'FungiblesBalance' })

const $q = useQuasar()
const { user } = useStore()

const fungibles = ref()
const menu = ref<string>('')
const options = ref<{
  issueTokens: boolean,
  data: {
    issueTokens: {
      tokenId: string,
      to: string,
      amount: string
    }
  }
}>({
  issueTokens: false,
  data: {
    issueTokens: {
      tokenId: '8bd45dbb4ffda188b076d230e66d1526ca81deaff2476f21cc485242a70e13c8',
      to: 'bchtest:zpm26e0c06kw43taf6yr5ghafx9e4vcf85ulnkswmg',
      amount: '123'
    }
  }
})

// watch(() => menu.value, (v: string) => {
//   issueTokens.value = v && v === 'issue-tokens' ? true : false
// })

onMounted(async () => {
  // console.log(user.wallet)
  console.log(user.wallet)
  fungibles.value = []
  await loadFtsFromUserWallet()
  await loadFtReservesFromMintingCovenant()
})

const loadFtsFromUserWallet = async () => {
  if (user.wallet) {
    let utxos = (await user.wallet.getAddressUtxos()).filter((u: UtxoI) => Boolean(u.token) && u.token !== undefined).map((u: UtxoI) => ({ ...u, source: 'wallet' }))
    console.log(utxos)
    fungibles.value.push(
      ...utxos
    )
  }
}

const loadFtReservesFromMintingCovenant = async () => {
  if (fungibles.value && fungibles.value.length > 0) {
    fungibles.value.forEach(async (t: UtxoI) => {
      const mintingCovenant = new MintingCovenant(t.token!.tokenId, user.wallet!.network, $q.notify)
      let mcWallet = await getWalletClass().watchOnly(mintingCovenant.contract.getTokenDepositAddress())
      let r = await mcWallet.getAddressUtxos()
      fungibles.value.push(...r.map((u: UtxoI) => ({ ...u, source: 'minting-covenant' })))
    })
  }
}

const confirmTokenIssuance = async (tokenId: string) => {
  options.value.issueTokens = false
  const baton = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) => u.token && u.token.tokenId === tokenId && u.token.commitment === '00')[0]
  if (!baton) {
    return $q.notify({ message: 'You don\'t own the minting baton for this token', type: 'negative', timeout: 3000 })
  }
  const mintingCovenant = new MintingCovenant(tokenId, user.wallet!.network, $q.notify)
  try {
    const tx = await mintingCovenant.unlockWithNft({
      contractOwner: user.connectedPaytacaAddress!,
      to: options.value.data!.issueTokens.to!,
      ftAmountToUnlock: options.value.data!.issueTokens.amount!,
    })
    if (tx) {
      $q.notify({ message: 'Success! Token transferred to recipient', type: 'positive', timeout: 5000 })
      $q.notify({ message: `Tx:${tx}`, type: 'positive', timeout: 10000 })
    }
  } catch (error: any) {
    if (error.message) {
      $q.notify({ message: error.message, type: 'negative', timeout: 5000 })
    }
  }
}

</script>
