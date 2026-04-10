<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end">
        <q-btn flat color="negative" icon="close" v-close-popup></q-btn>
      </div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 row items-center">
          <q-avatar class="q-mx-sm" v-if="minter.tokenUris?.icon">
            <img :src="minter.tokenUris?.icon" alt="" />
          </q-avatar>
          <span class="q-mx-sm text-bold">{{
            minter.tokenCategory?.symbol ? minter.tokenCategory.symbol : 'NFT'
          }}</span>
        </q-toolbar-title>
        <TokenCategory
          v-if="minter.token?.tokenId"
          :token-id="minter.token.tokenId"
        />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input
            :model-value="minter.token?.tokenId"
            label="Token ID/Category"
            filled
            dense
            disable
          >
          </q-input>
          <q-input
            :model-value="form.commitmentOfLastMint"
            :label="
              nftCollectionType === 'SequentialNftCollection'
                ? 'Commitment of Last Mint (Last Sequence Number)'
                : 'Token Commitment'
            "
            filled
            dense
            disable
          >
          </q-input>
          <div
            class="q-pa-sm rounded-borders"
            :class="$q.dark.isActive ? 'bg-grey-10' : 'bg-grey-2'"
          >
            Capability
            <sup
              ><code>{{ form.capability }}</code></sup
            >
            <q-option-group
              name="preferred_genre"
              v-model="form.capability"
              :options="[
                { value: 'minting', label: 'Minting' },
                { value: 'mutable', label: 'Mutable' },
                { value: 'none', label: 'None' },
              ]"
              color="primary"
              inline
            />
          </div>
          <div class="text-right">
            <q-checkbox
              v-model="form.excludeFromSequentialNftCollection"
              label="Exclude from Sequential NFT Collection"
            />
            <q-icon
              name="info"
              class="q-ml-sm"
              @click.stop="excludeFromSequentialNftCollectionHelp"
            >
              <q-tooltip>
                If checked,the minter won't keep track on the commitment of this
                NFT. Click for more info.
              </q-tooltip>
            </q-icon>
          </div>
          <q-input
            v-if="form.capability !== 'minting'"
            v-model="form.commitment"
            :label="
              nftCollectionType === 'SequentialNftCollection'
                ? 'Token Commitment (Sequence Number)'
                : 'Token Commitment'
            "
            :filled="true"
            :placeholder="tokenCommmitmentPlaceholderText"
            :rules="[
              (v) => /^[0-9A-Fa-f\s]+$/.test(v) || !v || 'Invalid value',
            ]"
            style="padding-bottom: unset"
            dense
            stack-label
          >
            <template v-slot:prepend>
              <q-btn
                :label="form.commitmentFormat === 'decimal' ? undefined : '0x'"
                flat
                dense
                size="sm"
                no-caps
                :icon-right="
                  form.commitmentFormat === 'decimal' ? 'pin' : undefined
                "
              />
            </template>
            <template v-slot:append>
              <q-btn
                @click="convertCommitment"
                color="warning"
                dense
                :flat="$q.dark.isActive ? true : false"
                :class="$q.dark.isActive ? '' : 'text-black'"
                :label="
                  form.commitmentFormat === 'decimal' ? 'To Hex' : 'To Number'
                "
                no-caps
              >
                <q-tooltip>
                  {{
                    form.commitmentFormat === 'decimal'
                      ? 'Click to value to hex'
                      : 'Click to convert value to a number'
                  }}
                </q-tooltip>
              </q-btn>
            </template>
          </q-input>
          <div
            v-if="
              form.capability === 'none' &&
              form.commitment &&
              form.commitmentFormat === 'hex'
            "
            class="row justify-end items-center"
          >
            <code>{{
              convertBigIntToHexLE(BigInt(parseInt(form.commitment, 16)))
            }}</code>
            <i
              >(Raw commitment value)
              <q-icon name="info">
                <q-tooltip>The actual value on-chain.</q-tooltip>
              </q-icon>
            </i>
          </div>
          <div
            v-if="
              form.capability === 'none' &&
              form.commitment &&
              form.commitmentFormat === 'decimal'
            "
            class="row justify-end items-center"
          >
            <code>{{ convertBigIntToHexLE(BigInt(form.commitment)) }}</code>
            <i
              >(Raw commitment value)
              <q-icon name="info">
                <q-tooltip>The actual value on-chain.</q-tooltip>
              </q-icon>
            </i>
          </div>
          <!-- <q-input v-model="form.commitment" label="Commitment" filled dense>
          </q-input> -->
          <q-input
            v-model="form.recipient"
            label="Recipient's Address"
            filled
            dense
          >
            <template v-slot:append>
              <q-btn
                dense
                :flat="$q.dark.isActive ? true : false"
                label="Self"
                color="warning"
                :class="$q.dark.isActive ? '' : 'text-black'"
                @click="form.recipient = user.wallet!.getTokenDepositAddress()"
              />
            </template>
          </q-input>
          <div class="text-right">
            <q-checkbox
              v-model="form.uploadNftAsset"
              label="Upload NFT asset"
            />
            <q-icon name="info" class="q-ml-sm">
              <q-tooltip>
                Upload real world asset that this NFT represent. E.g. a digital
                artwork.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="row justify-center">
            <q-uploader
              v-if="form.uploadNftAsset"
              ref="nftAssetUploader"
              @uploaded="onNftAssetUploaded"
              field-name="icon"
              :label="
                nftAssetUploader?.uploadProgressLabel === '100.00%'
                  ? 'Asset Uploaded'
                  : 'Upload NFT Asset'
              "
              flat
              :url="`api/tokens/nft/asset-upload?tokenId=${minter.token!.tokenId}&commitment=${nftCommitment}`"
              dense
              size="sm"
              style="width: 100%; max-width: 100%"
            />
          </div>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton
          @click="() => mintToken()"
          label="Mint NFT"
          :busyLabel="minter.processing"
          color="primary"
          :disable="disableMint"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { NFTCapability } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { CashToken } from 'src/apps';
import { useUser } from 'src/stores/user';
import TokenCategory from 'src/components/TokenCategory.vue';
import BusyButton from 'src/components/BusyButton.vue';
import convertHexLEtoBigInt from 'src/apps/utils/convertHexLEtoBigInt';
import { NftCollectionType } from 'src/apps/types';
import { shortenTokenId } from 'src/apps/utils';
import convertBigIntToHexLE from 'src/apps/utils/convertBigIntToHexLE';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';

const props = defineProps<{
  minter: CashToken;
}>();

const emit = defineEmits<{
  (
    e: 'nftMinted',
    val: {
      tokenId: string;
      recipient: string;
      capability: NFTCapability;
      commitment: string;
    },
  ): void;
}>();

const $q = useQuasar();
const { $ebus } = useEventBus();
const user = useUser();
const ui = useUI();
const nftAssetUploader = ref();
/**
 * Value of this should be resolved from bcmr, but since we're just currently supporting
 * SequentialNftCollection, we'll use the default. ParseableNftCollection will be handled
 * differently
 */
const nftCollectionType = ref<NftCollectionType>('SequentialNftCollection');

const form = ref<{
  capability: NFTCapability;
  commitmentOfLastMint: string;
  commitment: string;
  recipient: string;
  commitmentFormat: 'decimal' | 'hex';
  excludeFromSequentialNftCollection: boolean;
  uploadNftAsset: boolean;
  NftAssetUploadUris: any;
}>({
  capability: NFTCapability.none,
  commitmentOfLastMint: '', // Commitment of last mint (stored as commitment of the minter)
  commitment: '',
  recipient: '',
  commitmentFormat: 'decimal',
  excludeFromSequentialNftCollection: false,
  uploadNftAsset: false,
  NftAssetUploadUris: null,
});

const tokenCommmitmentPlaceholderText = computed<string>(() => {
  if (nftCollectionType.value === 'SequentialNftCollection') {
    return 'Enter a number';
  }
  return 'Enter commitment';
});

/**
 * Actual commitment on chain
 */
const nftCommitment = computed<string>(() => {
  let commitment = form.value.commitment;
  if (commitment && form.value.commitmentFormat === 'decimal') {
    commitment = convertBigIntToHexLE(BigInt(commitment));
  }

  if (commitment && form.value.commitmentFormat === 'hex') {
    if (nftCollectionType.value === 'SequentialNftCollection') {
      commitment = parseInt(commitment, 16).toString();
      commitment = convertBigIntToHexLE(BigInt(commitment));
    }
  } /*else commitment is raw hex provided by user*/
  return commitment;
});

const disableMint = computed(() => {
  if (!form.value.recipient) {
    return true;
  }
  if (
    form.value.uploadNftAsset &&
    nftAssetUploader.value.queuedFiles?.length <= 0
  ) {
    return true;
  }
  return false;
});

const onNftAssetUploaded = (info: any) => {
  try {
    const serverResponse = JSON.parse(info.xhr.responseText);
  } catch (error) {
    console.log(error);
  }
};

const convertCommitment = () => {
  if (form.value.commitment && form.value.commitmentFormat === 'decimal') {
    form.value.commitment = BigInt(form.value.commitment).toString(16);
    form.value.commitment =
      form.value.commitment.length < 2
        ? form.value.commitment.padStart(2, '0')
        : form.value.commitment;
    form.value.commitmentFormat = 'hex';
  } else if (form.value.commitment && form.value.commitmentFormat === 'hex') {
    form.value.commitment = parseInt(form.value.commitment, 16).toString();
    form.value.commitmentFormat = 'decimal';
  }
};

const mintToken = async () => {
  if (props.minter) {
    try {
      const tx = await props.minter.mintChild(form.value);
      if (tx) {
        emit('nftMinted', {
          tokenId: props.minter.token!.tokenId,
          ...form.value,
        });
        $q.notify({
          type: 'positive',
          message: 'Success!Tx=' + shortenTokenId(tx),
        });
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.mintChild',
          timestamp: new Date().getTime(),
          successMsg: `Minted new ${props.minter?.tokenCategory?.symbol || shortenTokenId(props.minter.token!.tokenId)} NFT`,
        });
        ui.setStatusMessage({
          statusMessage: `Minted new ${props.minter?.tokenCategory?.symbol || shortenTokenId(props.minter.token!.tokenId)} NFT`,
          statusMessageType: 'success',
          statusMessageTxid: tx,
        });
      }
    } catch (error: any) {
      ui.setStatusMessage({
        statusMessage: error,
        statusMessageType: 'error',
      });
      $q.notify({ type: 'negative', message: 'Error!' + error.message });
    }
  }
};

const initCommitment = () => {
  if (
    props.minter.token?.commitment &&
    nftCollectionType.value === 'SequentialNftCollection'
  ) {
    const commitmentOfLastMint = convertHexLEtoBigInt(
      props.minter.token.commitment,
    );
    form.value.commitmentOfLastMint = commitmentOfLastMint.toString();
    form.value.commitment = (commitmentOfLastMint + BigInt(1)).toString();
    form.value.commitmentFormat = 'decimal';
  } else {
    form.value.commitment = '1';
    form.value.commitmentFormat = 'decimal';
  }
};

const excludeFromSequentialNftCollectionHelp = () => {
  ui.setStatusMessage({
    statusMessage:
      "If the box is checked, the commitment of the child NFT being minted won't be tracked by the minter. This means that the sequence number will NOT increase. Recommended values are already set by default, i.e. exclude child with `minting` and `mutable` capability, include child with `none` capability.",
    statusMessageType: 'info',
  });
};

watch(
  () => form.value.commitment,
  (commitment) => {
    if (!commitment) {
      return (form.value.commitmentFormat = 'decimal'); //
    }
    if (/^(?!^\d+$)[0-9A-Fa-f]+$/.test(commitment)) {
      form.value.commitmentFormat = 'hex';
    }
  },
);

watch(
  () => form.value.capability,
  (c) => {
    if (c === NFTCapability.minting || c === NFTCapability.mutable) {
      form.value.excludeFromSequentialNftCollection = true;
    } else {
      form.value.excludeFromSequentialNftCollection = false;
    }
  },
);

watch(
  () => form.value.excludeFromSequentialNftCollection,
  (exclude) => {
    if (exclude) {
      form.value.commitment = '';
    } else {
      initCommitment();
    }
  },
);

onMounted(() => {
  initCommitment();
});
</script>
