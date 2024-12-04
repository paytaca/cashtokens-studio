<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-6 bg-content rounded-borders q-pa-lg">
        <div class="row justify-center q-gutter-lg q-ma-sm">
          <template v-if="!genesisInput">
            <div class="col-xs-12 text-h5 text-justify">
              <q-icon name="info" class="q-mr-xs"></q-icon>Creating a new AuthKey requires a
              "genesis input". A valid genesis input is just a UTXO that is the first output(v-out 0) of a previous
              transaction.
            </div>
            <div class="col-xs-12 text-right">
              <q-btn icon="handyman" text-color="primary" :label="!progress ? 'Generate Genesis Input' : ''"
                @click.stop="generateGenesisInput" :disable="!!progress" no-caps size="lg">
                <q-spinner-dots v-if="!!progress" class="q-ml-sm"></q-spinner-dots>
              </q-btn>
            </div>
          </template>
          <template v-else>
            <div class="col-xs-12 ">
              <span class="text-h3">Create AuthKey</span>
            </div>
            <div class="col-xs-12 q-my-lg">
              <div class="text-h5 q-my-lg">AuthKey <q-icon name="key" color="warning"></q-icon></div>
              <q-input :model-value="genesisInput.txid" label="AuthKey ID" outlined readonly>
                <template v-slot:append>
                  <CopyText :text="genesisInput.txid" />
                </template>
              </q-input>
            </div>
            <div class="col-xs-12 text-right">
              <q-btn icon="handyman" color="primary" :label="!progress ? 'Create AuthKey' : ''"
                @click.stop="createAuthKey" :disable="!!progress" no-caps size="lg">
                <q-spinner-dots v-if="!!progress" class="q-ml-sm"></q-spinner-dots>
              </q-btn>
            </div>
          </template>
        </div>
      </div>
    </div>
    <q-inner-loading :showing="!!progress" id="inner-loading" style="background-color:#0000002b">
      <q-spinner size="5em" color="warning" class="q-mb-lg"></q-spinner>
      <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">
        {{ progress }}
      </span>
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">

import { ref, onBeforeMount, toRaw } from 'vue'
import { NFTCapability, UtxoI, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useUser } from 'src/stores/user';
import { DEFAULT_TOKEN_VALUE, Watchtower, AuthKey } from 'src/app'
import { broadcastTx, buildGenesisInputTx, buildGenesisTx, signTx } from 'src/app/transactions';
import { useEventBus } from 'src/composables';
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import CopyText from 'src/components/CopyText.vue'
import { getInstance as getContractInstance } from 'src/app/contracts';

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const router = useRouter()
const genesisInput = ref<UtxoI>()
const progress = ref<string | boolean>()

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

const createAuthKey = async () => {
  progress.value = 'Processing, please wait...'
  const authKeyId = genesisInput.value!.txid!
  try {
    const genesisTransaction = await buildGenesisTx({
      input: toRaw(genesisInput.value!),
      token: {
        tokenId: authKeyId,
        commitment: '00',
        capability: NFTCapability.none,
        amount: BigInt(0),
      },
      wallet: user.wallet as Wallet,
      recipient: await user.wallet!.getTokenDepositAddress()
    })

    progress.value = 'Waiting for signature. Pls check your wallet!'
    const signingResult = await signTx({
      signer: user.transactionSigner!,
      decodedTx: genesisTransaction.decoded, sourceOutputs: genesisTransaction.sourceOutputs,
      prompt: 'Create AuthKey'
    }).catch((error) => {
      if (error?.reason) {
        $q.dialog({
          message: 'Response: ' + error?.reason
        })
      }
    })
    if (signingResult?.signedTransaction) {
      progress.value = 'Submitting transaction, please wait...'

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
          txType: 'token-genesis',
          timestamp: new Date().getTime(),
          successMsg: `AuthKey Created!`
        })

        const authGuard = getContractInstance('authguard-contract', {
          authKeyTokenId: authKeyId,
          network: user.wallet!.network,
        });
        const authGuardContractAddress = authGuard!.getTokenDepositAddress();
        new Watchtower().subscribe(authGuardContractAddress)

        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `AuthKey Created`,
            txid: tx
          }
        }).onDismiss(() => {
          // Intentional redundant subscription
          new Watchtower().subscribe(authGuardContractAddress)
          router.push({ name: 'authkeys' })

        })

      }
    }
  } catch (error: any) {
    console.log(error)
    $q.dialog({
      message: 'Error:' + error
    })
  } finally {
    progress.value = false
  }
}


onBeforeMount(async () => {
  progress.value = 'Checking your wallet for valid genesis inputs...'
  genesisInput.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) => u.vout == 0 && !u.token && u.satoshis == DEFAULT_TOKEN_VALUE)[0]
  progress.value = false
})

</script>
