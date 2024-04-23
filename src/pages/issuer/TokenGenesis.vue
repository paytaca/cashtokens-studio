<template>
  <q-layout view="lHh Lpr lFf" container style="height: 100vh">
    <q-footer style="background-color: unset;">
      <div class="text-right q-ma-lg">
        <q-btn
          v-if="!progress && registryIsValid && identitySnapshot?.name && identitySnapshot?.token?.symbol && identitySnapshot?.token?.category"
          color="primary" size="lg" @click.stop="createToken" :disable="!!progress">
          <span>Create Token</span>
        </q-btn>
      </div>
    </q-footer>
    <q-page-container>
      <q-page>
        <div class="row justify-center q-mx-sm">

          <div class="col-xs-12 q-col-gutter-y-lg col-sm-6 q-mt-md">
            <div v-if="authKey && genesisInput" class="col-xs-12 col-sm-6 ">
              <span class="text-h3 flex flex-wrap item-center">
                <span>Create Token</span>
              </span>
            </div>
            <div v-if="!genesisInput?.txid" class="col-xs-12 col-md-8">
              <div class="row items-center text-center q-gutter-sm justify-center">
                <span style="text-wrap:wrap" class="text-h5">
                  <q-icon name="info" class="q-mr-xs"></q-icon>Creating a new token requires a
                  "genesis input". A valid genesis input is just a UTXO that is the first output(v-out 0) of a previous
                  transaction. <q-btn icon="handyman" text-color="primary"
                    :label="!progress ? 'Generate Genesis Input' : ''" @click.stop="generateGenesisInput"
                    :disable="!!progress" no-caps size="lg" dense>
                    <q-spinner-dots v-if="!!progress && !genesisInput?.txid" class="q-ml-sm"></q-spinner-dots>
                  </q-btn>
                </span>
              </div>
            </div>
            <div v-if="genesisInput?.txid" class="col-xs-12 col-md-8 q-mb-lg ">
              <div v-if="!authKey && !useExistingAuthKey" class="col-xs-12 col-md-8 q-mb-lg">
                <div class="row items-center text-center q-gutter-sm">
                  <div class="row items-center text-center q-gutter-sm">
                    <span style="text-wrap:wrap" class="text-h5">
                      <q-icon name="info" class="q-mr-xs"></q-icon>Cashtokens Studio uses an
                      AuthGuard contract in keeping your token safe. AuthGuard requires an "AuthKey". <q-btn
                        text-color="primary" :label="!progress ? 'Click here!' : ''"
                        @click.stop="generateAuthKeyGenesisInput" :disable="!!progress" size="lg" no-caps dense>
                        <q-spinner-dots v-if="!!progress && !authKey" class="q-ml-sm"></q-spinner-dots>
                      </q-btn> if you want a new AuthKey for this token.
                      <template v-if="authKeyOptions && authKeyOptions.length > 0">
                        <div class="q-my-lg">Or</div>
                        <div> If
                          you want to use
                          an existing AuthKey <q-btn text-color="primary" label="Click here!" size="lg"
                            @click.stop="useExistingAuthKey = !useExistingAuthKey" no-caps dense>
                          </q-btn>
                        </div>
                      </template>

                    </span>
                  </div>
                </div>
              </div>
              <label v-if="useExistingAuthKey" class="flex justify-between items-center">
                <div class="text-h4 q-my-lg">Select AuthKey <q-icon name="key" color="warning"></q-icon></div>
                <q-btn color="primary" label="Create New AuthKey?" @click.stop="useExistingAuthKey = false" flat
                  no-caps>
                </q-btn>
              </label>
              <q-select v-if="useExistingAuthKey" v-model="authKeySelectedOption" :options="authKeyOptions" outlined>
              </q-select>
            </div>
            <template v-if="authKey?.txid && !useExistingAuthKey">
              <div class="flex justify-between">
                <span class="text-h4">AuthKey <q-icon name="key" color="warning"></q-icon> </span>
                <q-btn v-if="!authKey?.token?.tokenId" color="primary" label="Use Existing AuthKey?"
                  @click.stop="useExistingAuthKey = true" flat no-caps>
                </q-btn>
              </div>
              <q-input :model-value="authKey?.token?.tokenId || authKey?.txid"
                :label="authKey?.token?.tokenId ? 'AuthKey ID(existing, will be used)' : 'AuthKey ID (new, will be created)'"
                outlined readonly>
                <template v-slot:append>
                  <CopyText :text="authKey?.token?.tokenId || ''" />
                </template>
              </q-input>
            </template>
            <div v-if="genesisInput?.txid && authKey?.txid">
              <div class="text-h4 q-mb-lg">Select Token Type</div>
              <q-select v-if="!route.query.tokenType" v-model="tokenType"
                :options="[{ value: TokenType.ft, label: 'Fungible Token' }, { value: TokenType.nft, label: 'Non-Fungible Token (NFT)' }]"
                outlined autofocus>
                <template v-slot:prepend>
                  <q-icon v-if="tokenType?.value"
                    :name="tokenType.value == TokenType.ft ? 'money' : 'collections'"></q-icon>
                </template>
              </q-select>
              <div v-if="tokenType && tokenType?.value != TokenType.ft" class="text-right q-mt-lg">
                <q-checkbox v-model="showAdvancedFields" label="Show Advanced Fields"></q-checkbox>
              </div>
              <template v-if="authKey && tokenType">
                <Token v-if="tokenType && tokenType.value == TokenType.ft" v-model:token="token"
                  :hide="['commitment', 'capability']" :labels="{ amount: 'Max Supply' }" title="Token Details"
                  enable-max-amount-setter :symbol="symbol" />
                <Token v-else-if="tokenType && tokenType.value == TokenType.nft && !showAdvancedFields"
                  v-model:token="token" :hide="['amount', 'commitment', 'capability']" title="Token Details"
                  :capabilities="!showAdvancedFields ? [NFTCapability.minting] : undefined" :symbol="symbol" />
                <Token v-else-if="tokenType && tokenType.value == TokenType.nft && showAdvancedFields"
                  v-model:token="token" :hide="['amount']" title="Token Details" :symbol="symbol"
                  :capabilities="[NFTCapability.minting, NFTCapability.mutable]" />
                <Token v-else v-model:token="token"
                  :labels="{ amount: `Max Supply (vm = ${token.amount.replace('.', '')})` }" title="Token Details"
                  enable-max-amount-setter :symbol="symbol" />
                <q-input
                  v-if="tokenType.value != TokenType.nft && typeof (registry?.registryIdentity) == 'string' && registry.latestRevision && registry.identities && registry.identities[registry.registryIdentity][registry.latestRevision].token"
                  :model-value="registry.identities[registry.registryIdentity][registry.latestRevision].token!.decimals"
                  @update:model-value="(v) => updateDecimals(String(v || ''))" label="Decimals" :rules="decimalsRules"
                  outlined style="width:max-content" :disable="!token.amount">
                </q-input>
                <IdentitySnapshotComponent
                  v-if="registry?.registryIdentity && registry.latestRevision && registry.identities && typeof (registry.registryIdentity) == 'string'"
                  v-model:identity-snapshot="registry.identities[registry.registryIdentity][registry.latestRevision]"
                  :hide="['category']">
                  <template v-slot:token>
                    <TokenCategoryComponent
                      v-if="registry.identities[registry.registryIdentity][registry.latestRevision]?.token"
                      v-model:token="registry.identities[registry.registryIdentity][registry.latestRevision].token"
                      :hide="tokenCategoryHide" />
                  </template>
                  <template v-slot:uris>
                    <Uris v-if="registry.identities[registry.registryIdentity][registry.latestRevision]?.uris"
                      v-model:uris="registry.identities[registry.registryIdentity][registry.latestRevision].uris"
                      title="URIs" enable-icon-upload enable-add-uri :token-id="genesisInput?.txid"
                      @icon-file-uploading="(v) => progress = v ? 'Uploading icon...' : false" />
                  </template>
                </IdentitySnapshotComponent>
                <template v-if="showAdvancedFields">
                  <NftCategoryComponent
                    v-if="tokenType.value != TokenType.ft && registry?.registryIdentity && registry.latestRevision && registry.identities && typeof (registry.registryIdentity) == 'string' && registry.identities[registry.registryIdentity][registry.latestRevision]?.token?.nfts"
                    v-model:nft-category="registry.identities[registry.registryIdentity][registry.latestRevision].token!.nfts"
                    title="NFT Category (Optional)" />
                </template>
              </template>
            </div>
          </div>
        </div>
        <q-inner-loading :showing="!!progress" id="inner-loading" style="background-color:#0000002b">
          <q-spinner size="5em" color="warning" class="q-mb-lg"></q-spinner>
          <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">{{ progress
            }}</span>
        </q-inner-loading>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">

import { computed, onBeforeMount, onMounted, ref, toRaw, watch } from 'vue'
import { NFTCapability, type Registry, type IdentitySnapshot, type TokenI, type UtxoI, type Wallet } from 'mainnet-js'
import { useRoute, useRouter } from 'vue-router'
import { Draft07 } from 'json-schema-library'
import { DEFAULT_TOKEN_VALUE, TokenType, Watchtower } from 'src/app'
import { buildGenesisInputTx } from 'src/app/transactions/buildGenesisInputTx'
import { signTx } from 'src/app/transactions/signTx'
import { broadcastTx, buildGenesisTx } from 'src/app/transactions'
import { useUser } from 'src/stores/user'
import { useQuasar } from 'quasar'
import { shortenTx } from 'src/app/utils'
import { createRegistryTemplate } from 'src/app/bcmr'
import { getInstance as getAuthguardInstance } from 'src/app/contracts'
import bcmrSchema from 'src/app/bcmr/bcmr-v2.schema.json'
import { storeRegistry } from 'src/app/ipfs'
import { useEventBus } from 'src/composables'
import Token from 'src/components/Token.vue'
import TokenCategoryComponent from 'src/components/bcmr/TokenCategory.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import IdentitySnapshotComponent from 'src/components/bcmr/IdentitySnapshot.vue'
import NftCategoryComponent from 'src/components/bcmr/NftCategory.vue'
import Uris from 'src/components/bcmr/Uris.vue'
import CopyText from 'src/components/CopyText.vue'

const route = useRoute()
const router = useRouter()
const { $ebus } = useEventBus()
const authKey = ref<UtxoI | null>()  // the authkey
const authKeyOptions = ref<{ value: Omit<UtxoI, 'token'> & Omit<TokenI, 'amount'> & { amount: string }, label: string }[]>()       // authKey nft token category(s)
const authKeySelectedOption = ref()  // authKey nft's token category
const authKeyOptionsLoading = ref<boolean>()
const useExistingAuthKey = ref<boolean>()
const genesisInput = ref<UtxoI>()

const tokenType = ref<{ value: TokenType, label: string }>()
const tokenId = computed(() => genesisInput.value?.txid)
const token = ref<Omit<TokenI, 'amount'> & { amount: string }>({
  tokenId: '',
  amount: '',
  capability: undefined,
  commitment: undefined
})

const registry = ref<Registry>()

const identitySnapshot = computed<IdentitySnapshot | null>(() => {
  if (registry.value?.registryIdentity && typeof (registry.value.registryIdentity) == 'string' && registry.value.latestRevision && registry.value.identities) {
    return registry.value.identities[registry.value.registryIdentity][registry.value.latestRevision]
  }
  return null
})

const symbol = computed<string | undefined>(() => {
  if (registry.value?.registryIdentity && typeof (registry.value.registryIdentity) == 'string' && registry.value.latestRevision && registry.value.identities) {
    return registry.value.identities[registry.value.registryIdentity][registry.value.latestRevision].token?.symbol
  }
  return ''
})



const tokenCategoryHide = computed<string[]>(() => {
  return ['decimals', 'nfts', 'category']
})

const updateDecimals = (v: string) => {
  if (identitySnapshot.value?.token) {
    if (!v && token.value.amount) {
      return token.value.amount = token.value.amount.replace('.', '')
    }
    identitySnapshot.value.token.decimals = Number(v)
    const newAmount = token.value.amount?.replace('.', '') || ''
    const decimal_place = newAmount.length - Number(v)
    const whole = newAmount.substring(0, decimal_place)
    const decimal = newAmount.substring(decimal_place)
    return token.value.amount = `${whole}.${decimal}`
  }
}
// test


const registryIsValid = computed(() => {
  if (!registry.value) return false
  const d = new Draft07(bcmrSchema)
  const errors: any = d.validate(JSON.parse(JSON.stringify(registry.value)))
  return errors.length == 0
})

const decimalsRules = [
  (v: string | number) => (!v || (Number(v) >= 0 && Number(v) <= 18)) || 'Valid value is between 0 - 18 (inclusive)'
]
const showAdvancedFields = ref<boolean>()
const progress = ref<string | boolean>()
const user = useUser()
const $q = useQuasar()

const generateGenesisInput = async () => {
  try {
    progress.value = 'Preparing transaction, please wait...'
    const { decoded, sourceOutputs } = await buildGenesisInputTx({ wallet: user.wallet as Wallet })
    progress.value = 'Waiting for signature. Pls check your wallet!'
    const signingResult = await signTx({
      signer: user.transactionSigner!,
      decodedTx: decoded, sourceOutputs: sourceOutputs,
      prompt: 'Create genesis input'
    })
    if (signingResult?.signedTransaction) {
      const tx = await broadcastTx(signingResult)
      if (tx) {
        progress.value = 'Transaction submitted, awaiting propagation...'
        await user.wallet?.waitForTransaction({ txHash: tx })
        genesisInput.value = (await user.wallet?.getAddressUtxos())?.filter((u: UtxoI) =>
          !u.token &&
          u.vout == 0 &&
          u.satoshis >= DEFAULT_TOKEN_VALUE
        )[0]
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'generate-genesis-input',
          timestamp: new Date().getTime(),
          successMsg: `Genesis input created!`
        })
        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `Genesis input created!`,
            txid: tx
          }
        })
      }
    }
  } catch (error) {
    $q.dialog({
      message: error?.toString(),
      ok: true,
      focus: 'ok',
      class: 'q-pa-lg'
    })
  } finally {
    progress.value = false
  }
}

const generateAuthKeyGenesisInput = async () => {
  try {
    progress.value = 'Generating AuthKey genesis input'
    const { decoded, sourceOutputs } = await buildGenesisInputTx({ wallet: user.wallet as Wallet })
    const signingResult = await signTx({
      signer: user.transactionSigner!,
      decodedTx: decoded, sourceOutputs: sourceOutputs,
      prompt: 'Create AuthKey genesis input'
    })
    if (signingResult?.signedTransaction) {
      const tx = await broadcastTx(signingResult)
      if (tx) {
        await user.wallet?.waitForTransaction({ txHash: tx })
        authKey.value = (await user.wallet?.getAddressUtxos())?.filter((u: UtxoI) =>
          !u.token &&
          u.vout == 0 &&
          u.satoshis >= DEFAULT_TOKEN_VALUE &&
          u.txid != genesisInput.value?.txid &&
          u.txid == tx
        )[0]

        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'generate-genesis-input',
          timestamp: new Date().getTime(),
          successMsg: `Genesis input for AuthKey created!`
        })

        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `Genesis input created!`,
            txid: tx
          }
        })
      }
    }

  } catch (error) {
    $q.dialog({
      message: error?.toString(),
      ok: true,
      focus: 'ok',
      class: 'q-pa-lg'
    })
  } finally {
    progress.value = false
  }
}

const getAuthKeyOptions = async () => {
  const authKeys = (await user.wallet!.getAddressUtxos())
    .filter((u: UtxoI) => u.token && u.token.commitment == '00')
    .map((u: UtxoI) => {
      const clone: any = structuredClone(u)
      clone.token.amount = (clone.token.amount || 0).toString()
      const v = {
        label: shortenTx(u.token!.tokenId),
        value: clone
      }
      return v
    })
  return authKeys
}

const createToken = async () => {
  if (!registry.value) {
    return $q.dialog({
      message: 'Invalid metadata'
    })
  }
  if (!authKey.value) {
    return $q.dialog({
      message: 'Please select an AuthKey'
    })
  }
  progress.value = 'Processing, please wait...'

  if (tokenType.value?.value == TokenType.ft) {
    delete registry.value?.identities![registry.value.registryIdentity as string][registry.value.latestRevision].token?.nfts
  }

  registry.value.extensions!.authNft = authKey.value?.token?.tokenId ?? authKey.value!.txid

  const d = new Draft07(bcmrSchema)
  const errors: any = d.validate(JSON.parse(JSON.stringify(registry.value)))
  if (errors.length > 0) {
    $q.dialog({
      message: 'Invalid metadata, make sure you filled up the required (*) fields.',
      class: 'text-justify q-pa-lg'
    })
    progress.value = false
    return
  }

  try {
    const artifact = await storeRegistry(JSON.stringify(registry.value))
    if (!artifact) {
      $q.dialog({
        message: `Failed storing metadata in IPFS, please try again later...`
      })
      return
    }
    let { amount, commitment, tokenId, capability } = token.value
    tokenId = genesisInput.value!.txid

    progress.value = 'Preparing transaction, please wait...'
    const aKey = toRaw(authKey.value!)
    if (aKey.token) {
      aKey.token!.amount = BigInt(aKey.token!.amount)
    } else {
      delete aKey.token
    }
    amount = String(amount).replace('.', '')
    const genesisTransaction = await buildGenesisTx({
      input: toRaw(genesisInput.value!),
      token: {
        tokenId,
        commitment,
        capability,
        amount: BigInt(amount),
      },
      wallet: user.wallet as Wallet,
      authKey: aKey,
      publishBCMR: {
        uris: [artifact.uris.https, artifact.uris.ipfs],
        contentHash: artifact.contentHash
      }
    })
    progress.value = 'Waiting for signature. Pls check your wallet!'
    const signingResult = await signTx({
      signer: user.transactionSigner!,
      decodedTx: genesisTransaction.decoded, sourceOutputs: genesisTransaction.sourceOutputs,
      prompt: 'Token genesis'
    })
    if (signingResult?.signedTransaction) {
      progress.value = 'Submitting transaction, please wait...'
      const authGuard = getAuthguardInstance('authguard-contract', { authKeyTokenId: authKey.value?.token?.tokenId || authKey.value!.txid as string, network: user.wallet!.network })
      await (new Watchtower()).subscribe(authGuard!.getTokenDepositAddress())
      const tx = await broadcastTx(signingResult)
      await (new Watchtower()).subscribe(authGuard!.getTokenDepositAddress())
      if (tx) {
        progress.value = 'Transaction submitted, awaiting propagation...'
        await user.wallet?.waitForTransaction({ txHash: tx })
        genesisInput.value = (await user.wallet?.getAddressUtxos())?.filter((u: UtxoI) =>
          !u.token &&
          u.vout == 0 &&
          u.satoshis >= DEFAULT_TOKEN_VALUE
        )[0]
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'token-genesis',
          timestamp: new Date().getTime(),
          successMsg: `${identitySnapshot.value?.token?.symbol} Token Created!`
        })
        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `${identitySnapshot.value?.token?.symbol} Token Created!`,
            txid: tx
          }
        }).onOk(() => {
          if (tokenType.value?.value == 'nft' || tokenType.value?.value == 'hybrid') {
            router.push({ name: 'nft-reserves' })
          } else {
            router.push({ name: 'ft-reserves' })
          }

        })

      }
    }
  } catch (error: any) {
    $q.dialog({
      message: 'Error:' + error
    })
  } finally {
    progress.value = false
  }
}

watch(() => genesisInput.value?.txid, (v) => {
  if (v) {
    registry.value = createRegistryTemplate(v, new Date().toISOString())
  } else {
    registry.value = undefined
  }
})

watch(() => tokenId.value, (v) => {
  token.value.tokenId = v || ''
})

watch(() => useExistingAuthKey.value, async (yes) => {
  if (yes) {
    authKeyOptionsLoading.value = true
    progress.value = 'Checking your wallet for AuthKeys...'
    authKeyOptions.value = await getAuthKeyOptions()
    progress.value = false
    if (authKeyOptions.value) {
      authKeySelectedOption.value = authKeyOptions.value[0]
      authKey.value = authKeySelectedOption.value.value
    }
    authKeyOptionsLoading.value = false
  } else {
    progress.value = 'Checking for valid genesis input...'
    authKey.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) =>
      u.vout == 0 &&
      !u.token &&
      u.satoshis >= DEFAULT_TOKEN_VALUE &&
      u.txid != genesisInput.value!.txid
    )[0]
    progress.value = false
  }
})

watch(() => authKeySelectedOption.value, (v) => {
  authKey.value = v.value
})

watch(() => token.value.amount, (v) => {
  if (identitySnapshot.value?.token) {
    let decimalPlacePosition = (v || '').indexOf('.')
    if (decimalPlacePosition >= 0) {
      identitySnapshot.value.token.decimals = v.substring(decimalPlacePosition + 1).length
    } else {
      identitySnapshot.value.token.decimals = 0
    }
  }
})

watch(() => tokenType.value, (v) => {
  if (v?.value == TokenType.nft || v?.value == TokenType.hybrid) {
    if (!token.value.capability) {
      token.value.capability = NFTCapability.minting

    }
    if (!token.value.commitment) {
      token.value.commitment = ''
    }
    if (registry.value?.registryIdentity && registry.value?.latestRevision && typeof (registry.value.registryIdentity) == 'string' && registry.value.identities) {
      if (!registry.value.identities[registry.value.registryIdentity][registry.value.latestRevision]?.token?.nfts) {
        registry.value.identities[registry.value.registryIdentity][registry.value.latestRevision].token!.nfts = {
          parse: {
            bytecode: '',
            types: {}
          }
        }
      }
    }
  } else {
    delete token.value.capability
    delete token.value.commitment
    if (registry.value?.registryIdentity && registry.value?.latestRevision && typeof (registry.value.registryIdentity) == 'string' && registry.value.identities) {
      registry.value.identities[registry.value.registryIdentity][registry.value.latestRevision]?.token?.nfts
    }
  }
})


onBeforeMount(async () => {
  progress.value = 'Checking your wallet for valid genesis inputs...'
  genesisInput.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) => u.vout == 0 && !u.token && u.satoshis >= DEFAULT_TOKEN_VALUE)[0]
  if (genesisInput.value) {
    authKey.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) =>
      u.vout == 0 &&
      !u.token &&
      u.satoshis >= DEFAULT_TOKEN_VALUE &&
      u.txid != genesisInput.value!.txid
    )[0]
  }
  progress.value = false
})

onMounted(() => {
  showAdvancedFields.value = false
  let label
  if (route.query.tokenType == TokenType.ft) {
    label = 'Fungible Token'
  }
  if (route.query.tokenType == TokenType.nft) {
    label = 'NFT'
  }
  if (route.query.tokenType == TokenType.hybrid) {
    label = 'Hybrid'
  }

  if (label) {
    tokenType.value = { value: route.query.tokenType as TokenType, label }
  }

  (async () => {
    authKeyOptions.value = await getAuthKeyOptions()
    if ((authKeyOptions.value?.length ?? 0) > 0) {
      useExistingAuthKey.value = true
    }
  })()

})



// const nftType = ref<NftType>({
//   name: '',
//   description: '',
//   fields: [''],
//   uris: {
//     web: ''
//   },
//   extensions: { test: 'one' }
// })

</script>