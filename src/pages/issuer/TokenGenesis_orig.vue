<template>
  <div class="q-pa-md">
    <q-layout view="lHh Lpr lFf" container style="height: 100vh">
      <q-footer v-if="genesisInput && authKey" style="background-color: unset;">
        <div class="text-right q-ma-lg">
          <q-btn v-if="!progress" color="primary" size="lg" @click.stop="(e: any) => form.submit(e)">
            <q-spinner v-if="progress"></q-spinner>
            <span>Create Token</span>
          </q-btn>
        </div>
      </q-footer>
      <q-page-container>
        <q-page padding>
          <!-- :class="$q.screen.gt.xs && $q.screen.lt.lg ? 'justify-between' : 'justify-center'" -->
          <div class="row justify-center"
            :class="$q.screen.gt.xs && $q.screen.lt.lg ? 'justify-between' : 'justify-center'">
            <div class="col-xs-12 col-sm-2 text-center">
              <q-img v-if="iconPreviewUrl" :src="iconPreviewUrl" class="rounded-borders" size="400px"></q-img>
              <q-icon v-else name="broken_image" :size="$q.screen.xs ? '250px' : '400px'" color="grey-8"></q-icon>
            </div>
            <div class="col-xs-12 col-sm-8 col-lg-9">
              <div class="row justify-center">
                <!-- <div class="text-h4 col-xs-12 col-md-8 q-mb-lg text-white text-bold text-white">Token Genesis</div> -->
                <div class="text-h3 col-xs-12 col-md-8 q-mb-lg text-white text-bold text-white"
                  :class="$q.screen.xs ? 'text-center' : ''">{{ route?.query?.title
        || 'Token Genesis' }}</div>
                <div class="text-h4 col-xs-12 col-md-8 q-mb-lg text-white text-bold text-white">Dependencies</div>
                <div v-if="!genesisInput?.txid" class="col-xs-12 col-md-8 q-mb-lg">
                  <div class="row items-center text-center q-gutter-sm">
                    <q-icon name="warning" color="warning"></q-icon>
                    <span style="text-wrap:wrap">
                      We need a token ID. Click `generate`.
                    </span>
                  </div>
                </div>
                <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                  <label for="genesisInput">Token Id</label>
                  <q-input name="genesisInput" :model-value="genesisInput?.txid"
                    :loading="!!progress && !genesisInput?.txid" disable outlined readonly>
                    <template v-slot:prepend>
                      <q-icon :name="!genesisInput?.txid ? 'warning' : 'token'"
                        :color="!genesisInput?.txid ? 'warning' : 'primary'"></q-icon>
                    </template>
                    <template v-slot:append>
                      <q-icon :name="genesisInput?.txid ? 'do_not_touch' : ''"></q-icon>
                    </template>
                    <template v-slot:after>
                      <q-btn v-if="!genesisInput?.txid" icon="handyman" text-color="primary" size="lg" label="Generate"
                        @click.stop="generateGenesisInput" :disable="!!progress">
                        <q-spinner-dots v-if="!!progress && !genesisInput?.txid" class="q-ml-sm"></q-spinner-dots>
                      </q-btn>
                    </template>
                  </q-input>
                </div>

                <div v-if="genesisInput?.txid" class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                  <div v-if="!authKey && !useExistingAuthKey" class="col-xs-12 col-md-8 q-mb-lg">
                    <div class="row items-center text-center q-gutter-sm">
                      <q-icon name="warning" color="warning"></q-icon>
                      <span style="text-wrap:wrap ;">
                        We need an AuthKey ID. Click `generate` or use existing.
                      </span>
                    </div>
                  </div>
                  <label>
                    {{ useExistingAuthKey ? 'Choose AuthKey below' : 'AuthKey ID' }}
                    <q-btn color="secondary"
                      :label="useExistingAuthKey ? 'Create new AuthKey?' : 'Use existing AuthKey?'"
                      @click.stop="useExistingAuthKey = !useExistingAuthKey" flat no-caps>
                    </q-btn>
                  </label>
                  <q-select v-if="useExistingAuthKey" v-model="authKeySelectedOption" :options="authKeyOptions"
                    outlined>
                  </q-select>
                  <q-input v-else :model-value="authKey?.txid" :loading="!!progress" outlined readonly disable>
                    <template v-slot:after>
                      <q-btn v-if="!authKey" icon="handyman" text-color="primary" size="lg" label="Generate"
                        @click.stop="generateAuthKeyGenesisInput" :disable="!!progress">
                        <q-spinner-dots v-if="!!progress" class="q-ml-sm"></q-spinner-dots>
                      </q-btn>
                    </template>
                    <template v-slot:prepend>
                      <q-icon :name="!authKey?.txid ? 'warning' : 'key'" color="warning"></q-icon>
                    </template>
                    <template v-slot:append>
                      <q-icon :name="authKey?.txid ? 'do_not_touch' : ''"></q-icon>
                    </template>

                  </q-input>
                </div>
                <template v-if="genesisInput?.txid && authKey">
                  <div class="col-xs-12 col-md-8 text-white text-white text-right">
                    <q-checkbox v-model="showAdvancedOptions" label="Show Advanced Fields"></q-checkbox>
                  </div>
                  <q-form ref="form" class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-md items-center row"
                    :disabled="disableForm" @submit.prevent="createToken">

                    <div class="text-h4 col-xs-12 col-md-8 q-mt-lg text-white text-bold text-white">
                      Token Metadata
                      <div class="text-caption text-italic">
                        Describe your {{ tokenSpec?.tokenType == 'nft' ? 'NFT Collection' : 'token' }}
                      </div>
                    </div>
                    <!-- <div class="text-h6 col-12">Identity</div> -->
                    <div class="col-12 q-gutter-y-sm">
                      <label>{{ tokenSpec?.tokenType == 'nft' ? 'Collection' : '' }} Name *</label>
                      <q-input v-model="tokenMetadata.name" :rules="[(v: any) => !!v || 'Name is required']" outlined
                        autogrow autofocus>
                      </q-input>
                    </div>
                    <div class="col-12 q-gutter-y-sm">
                      <label>Description</label>
                      <q-input v-model="tokenMetadata.description" outlined autogrow clearable> </q-input>
                    </div>
                    <div class="col-8 q-gutter-y-sm col-xs-grow">
                      <label>Token Symbol *</label>
                      <q-input v-model="tokenMetadata.token!.symbol" :rules="symbolRules" outlined>
                      </q-input>
                    </div>
                    <div v-if="tokenSpec.tokenType == 'ft' || tokenSpec.tokenType == 'hybrid'"
                      class="col-auto q-gutter-y-sm col-grow">
                      <label>Token Decimals *</label>
                      <q-input v-model="tokenMetadata.token!.decimals" :rules="[(v: any) => !!v || 'Required']"
                        outlined>
                      </q-input>
                    </div>
                    <!-- {{ tokenMetadata.token!.decimals }} -->
                    <div class="col-12 q-gutter-y-sm col-grow">
                      <label>Token Category *</label>
                      <q-input v-model="genesisInput.txid" :rules="[(v: any) => !!v || 'Required']" outlined disable
                        readonly>
                        <template v-slot:append>
                          <q-icon name="do_not_touch"></q-icon>
                        </template>
                      </q-input>
                    </div>
                    <!-- <div class="text-h6">
                      Pick the token's icon
                    </div>
                    <div class="col-12 q-gutter-y-sm">
                      <label v-if="iconFileUploading" class="text-warning">
                        Uploading<q-spinner-dots color="warning" class="q-mr-sm"></q-spinner-dots>
                      </label>
                      <q-file v-model="iconFile" accept=".jpg,.png, image/*" @rejected="() => console.log('rejected')"
                        :disable="iconFileUploading" outlined>
                        <template v-slot:prepend>
                          <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
                          <q-icon v-else-if="!tokenMetadata.uris!.icon" name="broken_image" />
                          <q-avatar v-else-if="tokenMetadata.uris!.icon">
                            <q-img :src="tokenMetadata.uris!.icon"></q-img>
                          </q-avatar>
                        </template>
                        <template v-slot:append>
                          <q-icon name="attach_file" />
                        </template>
                      </q-file>
                    </div> -->
                    <div class="col-xs-12 q-gutter-y-sm items-center"
                      :style="$q.screen.xs ? 'margin-bottom: 4rem' : 'margin-bottom: 2rem'">
                      <label>
                        {{ tokenSpec.tokenType == 'nft' ? 'NFT Collection' : 'Token' }}
                        Icon
                        {{ iconFileUploading ? 'Uploading' : '' }}
                        <q-spinner-dots v-if="iconFileUploading" color="warning" class="q-mr-sm">
                        </q-spinner-dots>
                      </label>
                      <div>
                        <q-file ref="iconFileRef" v-model="iconFile" accept=".jpg, .png, image/*"
                          @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
                          :disable="iconFileUploading" outlined bottom-slots class="hidden">
                        </q-file>
                        <q-input v-model="tokenMetadata.uris!.icon" outlined autogrow bottom-slots
                          placeholder="Click the upload button or paste the icon's URL">

                          <template v-slot:prepend>
                            <div @click.stop="iconFileRef.pickFiles()">
                              <q-spinner-box v-if="iconFileUploading" color="warning"></q-spinner-box>
                              <span v-else>
                                <q-avatar v-if="tokenMetadata.uris!.icon">
                                  <q-img :src="ipfsToGatewayUrl(tokenMetadata.uris!.icon)"></q-img>
                                </q-avatar>
                                <q-btn v-else icon="upload_file" class="cursor-pointer" text-color="warning" dense />
                              </span>
                            </div>
                          </template>

                          <template v-slot:hint>
                            <span style="line-height: 1.2rem;">
                              It's recommended to provide an image as icon for this NFT so it'll show up nicely on
                              user
                              interfaces.
                              Recommended max size is 400x400.
                            </span>
                          </template>
                        </q-input>
                      </div>
                    </div>
                    <div class="col-12 text-h6  text-bold">URIs</div>
                    <div class="col-12 q-gutter-y-sm">
                      <div v-for="[k], i  in  Object.entries(tokenMetadata.uris!)" :key="i" class="q-gutter-sm">
                        <template v-if="k != 'icon'">
                          <label style="text-transform: capitalize;">{{ k }}</label>
                          <q-input input-
                            @update:model-value="(v: any) => tokenMetadata.uris = { ...tokenMetadata.uris, ...{ [k]: v } }"
                            :model-value="tokenMetadata.uris?.[k]"
                            :placeholder="k == 'web' ? 'Your token project\'s website' : ''" outlined>
                            <template v-slot:after>
                              <q-btn v-if="k !== 'icon' && k !== 'web'" text-color="negative" icon="delete"
                                @click="delete tokenMetadata.uris![k]"></q-btn>
                            </template>
                            <template v-slot:prepend>
                              <q-avatar v-if="k == 'icon'" @click="delete tokenMetadata.uris![k]">
                                <q-img v-if="tokenMetadata.uris?.icon" :src="tokenMetadata.uris.icon" />
                                <q-icon v-else name="broken_image" color="grey-8" size="4em"></q-icon>
                              </q-avatar>
                            </template>
                          </q-input>
                        </template>
                      </div>
                      <div class="text-right">
                        <q-btn @click="openAddUriDialog" icon="add" text-color="primary">
                        </q-btn>
                      </div>
                    </div>
                    <template v-if=showAdvancedOptions>
                      <div class="text-h4 col-xs-12 col-md-8 text-white text-bold text-white">
                        Token Spec
                      </div>
                      <div class="col-12 q-gutter-y-sm">
                        <label>{{ route.query.tokenType ? 'Token Type' : 'Select Token Type' }}</label>
                        <q-option-group v-if="!route.query.tokenType" name="preferred_genre"
                          v-model="tokenSpec.tokenType"
                          :options="[{ value: 'nft', label: 'Non Fungible Token(NFT)' }, { value: 'ft', label: 'Fungible Token(FT)' }]"
                          color="primary" inline />
                        <q-input v-else :model-value="(route.query.tokenType as string)" outlined disable readonly>
                          <template v-slot:append>
                            <q-icon name="do_not_touch"></q-icon>
                          </template>
                        </q-input>
                      </div>
                      <template v-if="tokenSpec.tokenType == 'nft' || tokenSpec.tokenType == 'hybrid'">
                        <div v-if="showAdvancedOptions" class="col-12 q-gutter-y-sm">
                          <label>{{ !route.query.capability ? 'Select ' : '' }} NFT Capability</label>
                          <q-select v-if="!route.query.capability || showAdvancedOptions"
                            v-model="tokenSpec.token.capability" :options="nftCapabilityOptions" outlined>
                          </q-select>
                          <q-input v-else :model-value="(route.query.capability as string)" outlined disable readonly>
                            <template v-slot:append>
                              <q-icon name="do_not_touch"></q-icon>
                            </template>
                          </q-input>
                        </div>
                        <div v-if="showAdvancedOptions" class="col-12 q-gutter-y-sm">
                          <label>NFT Commitment (Optional)</label>
                          <q-input v-model="tokenSpec.token.commitment" :rules="commitmentRules" bottom-slots outlined>
                            <template v-slot:prepend>
                              <span class="text-grey-8">
                                {{ tokenSpec.nftCommitmentFormat == 'hex' ? '0x' : '#' }}
                              </span>
                            </template>
                            <template v-slot:append>
                              <q-btn :label="tokenSpec.nftCommitmentFormat == 'hex' ? 'To Number' : 'To Hex'"
                                text-color="warning" @click.stop="convertCommitment" dense no-caps></q-btn>
                            </template>
                            <template v-slot:hint>
                              <span>No need to set this when creating a SequentialNftCollection. </span>
                            </template>
                          </q-input>
                        </div>
                      </template>

                    </template>

                    <div v-if="tokenSpec.tokenType == 'ft' || tokenSpec.tokenType == 'hybrid'"
                      class="col-12 q-gutter-y-sm">
                      <label>Max Supply</label>
                      <q-input v-model="tokenSpec.token.amount" outlined :rules="tokenAmountRules">
                        <template v-slot:append>
                          <q-btn text-color="warning" :class="$q.dark.isActive ? '' : 'text-black'"
                            @click="setFtSupplyToMax" label="Max" />
                        </template>
                      </q-input>
                      <div class="row justify-end">
                        <div class="col">
                          <div v-if="tokenSpec.token.amount" class="row items-center justify-left">
                            <span style="font-variant-numeric: tabular-nums;font-size: .9em;"
                              class="col-auto text-thin text-orange text-caption">
                              Raw FT Amount:
                              {{ tokenSpec.token.amount.replace('.', '') }}
                            </span>
                            <span class="col-auto text-bold text-grey-4 q-ml-md"
                              style="font-size: 2em; letter-spacing: 3px; font-variant: unicase; text-transform: uppercase;">
                              {{ `${tokenMetadata.token!.symbol}` }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <template v-if="tokenSpec.tokenType !== 'ft' && showAdvancedOptions">
                      <div class="text-h4 col-xs-12 col-md-8 q-mt-lg text-white text-bold text-white">
                        NFT Collection Type
                      </div>
                      <div class="col-12 q-gutter-y-sm">
                        <q-option-group v-model="tokenSpec.nftCollectionType"
                          :options="[{ value: NFTCollectionType.sequential, label: 'SequentialNftCollection (Basic)' }, { value: NFTCollectionType.parsable, label: 'ParsableNftCollection (Advanced/Not Yet Supported)', disable: true },]"
                          color="primary" inline :disable="!showAdvancedOptions" />
                      </div>
                      <div v-if="tokenSpec.nftCollectionType == NFTCollectionType.parsable"
                        class="col-12 q-gutter-y-sm">
                        <label>Parsing Bytecode *</label>
                        <q-input v-model="tokenMetadata.token!.nfts!.parse!.bytecode"
                          :rules="[(v: any) => !!v || 'Required']" outlined>
                        </q-input>
                      </div>
                      <div class="text-h4 col-xs-12 col-md-8  text-white text-bold text-white">
                        NFT Metadata <span class="text-thin">(Optional)</span>
                      </div>
                      <div v-if="showAdvancedOptions" class="col-12 q-gutter-y-sm">
                        <label>NFT Type</label>
                        <q-input v-if="tokenSpec.nftCollectionType == NFTCollectionType.sequential"
                          :model-value="formatCommitment(tokenSpec.token.commitment || '', tokenSpec.nftCommitmentFormat, 'vm-number')"
                          outlined disable readonly bottom-slots>
                          <template v-slot:prepend>
                            <q-icon color="grey-8">0x</q-icon>
                          </template>
                          <template v-slot:append>
                            <q-icon name="do_not_touch"></q-icon>
                          </template>
                          <template v-slot:hint>
                            <div class="q-mb-md">
                              <span class="text-md ">
                                Value of this will be the same as the NFT commitment above in vm-number format.
                              </span>
                            </div>
                          </template>
                        </q-input>
                        <q-input v-else v-model="nftTypeKey" placeholder="Enter bottom alt stack hex value" outlined>
                          <template v-slot:hint>
                            <div class="q-mb-md">
                              <span class="text-md" style="line-height: 2em;">
                                Value of this is the expected hex-encoded value of the bottom altstack item following
                                evaluation of `token.nfts.parse.bytecode`
                              </span>
                            </div>
                          </template>
                          <template v-slot:prepend>
                            <q-icon color="grey-8">0x</q-icon>
                          </template>
                        </q-input>
                      </div>
                      <div class="col-12 q-gutter-y-sm">
                        <label>NFT name</label>
                        <q-input v-model="nftType.name" outlined>
                        </q-input>
                      </div>
                      <div class="col-12 q-gutter-y-sm">
                        <label>NFT description</label>
                        <q-input v-model="nftType.description" outlined>
                        </q-input>
                      </div>
                      <div class="col-xs-12  q-my-md q-gutter-y-sm items-center"
                        :style="$q.screen.xs ? 'margin-bottom: 2rem' : ''">
                        <label>NFT Asset {{ assetFileUploading ? 'Uploading' : '' }}<q-spinner-dots
                            v-if="assetFileUploading" color="warning" class="q-mr-sm"></q-spinner-dots></label>
                        <div>
                          <q-file ref="assetFileRef" v-model="assetFile"
                            @rejected="() => $q.dialog({ message: 'File Rejected!' })" :disable="assetFileUploading"
                            outlined bottom-slots class="hidden">
                          </q-file>
                          <q-input v-model="nftType.uris!.asset" outlined autogrow bottom-slots
                            placeholder="Click the upload button or paste the icon's URL">
                            <template v-slot:prepend>
                              <div @click.stop="assetFileRef.pickFiles()">
                                <q-spinner-box v-if="assetFileUploading" color="warning"></q-spinner-box>
                                <span v-else>
                                  <q-avatar v-if="nftType.uris!.asset">
                                    <q-img :src="ipfsToGatewayUrl(nftType.uris!.asset)"></q-img>
                                  </q-avatar>
                                  <q-btn v-else icon="upload_file" class="cursor-pointer" text-color="warning" dense />
                                </span>
                              </div>
                            </template>

                            <template v-slot:hint>
                              <span style="line-height: 1rem;">
                                This is the real-world asset tokenized by this NFT. E.g. a digital artwork, music etc...
                              </span>
                            </template>
                          </q-input>
                        </div>
                      </div>
                      <div class="col-xs-12  q-my-lg q-gutter-y-sm items-center"
                        :style="$q.screen.xs ? 'margin-bottom: 4rem' : 'margin-bottom: 2rem'">
                        <label>NFT Icon {{ nftIconUploading ? 'Uploading' : '' }}<q-spinner-dots v-if="nftIconUploading"
                            color="warning" class="q-mr-sm"></q-spinner-dots></label>
                        <div>
                          <q-file ref="nftIconFileRef" v-model="nftIconFile" accept=".jpg, .png, image/*"
                            @rejected="() => $q.dialog({ message: 'File rejected, make sure to upload an image file!' })"
                            :disable="nftIconUploading" outlined bottom-slots class="hidden">
                          </q-file>
                          <q-input v-model="nftType.uris!.icon" outlined autogrow bottom-slots
                            placeholder="Click the upload button or paste the icon's URL">

                            <template v-slot:prepend>
                              <div @click.stop=" nftIconFileRef.pickFiles()">
                                <q-spinner-box v-if="nftIconUploading" color="warning"></q-spinner-box>
                                <span v-else>
                                  <q-avatar v-if="nftType.uris!.icon">
                                    <q-img :src="ipfsToGatewayUrl(nftType.uris!.icon)"></q-img>
                                  </q-avatar>
                                  <q-btn v-else icon="upload_file" class="cursor-pointer" text-color="warning" dense />
                                </span>
                              </div>
                            </template>

                            <template v-slot:hint>
                              <span style="line-height: 1.2rem;">
                                It's recommended to provide an image as icon for this NFT so it'll show up nicely on
                                user
                                interfaces.
                                Recommended max size is 400x400.
                              </span>
                            </template>
                          </q-input>
                        </div>
                      </div>
                      <div class="col-12">
                        <div class="text-h6 ">Attributes<q-btn flat color="primary" icon="add" size="md"
                            @click="openAttributeDialog" type="button" />
                        </div>
                        <div class="row q-gutter-md flex justify-between  q-mx-auto q-mt-lg  q-pa-lg rounded-borders"
                          :class="Object.keys(nftTypeAttributes).length > 0 ? 'bg-grey-10' : ''">
                          <div v-for="attrKey, i in Object.keys(nftTypeAttributes)" class="q-gutter-y-sm" :key="i">
                            <label>{{ attrKey }}</label>
                            <q-input v-model="nftTypeAttributes[attrKey]" outlined dense>

                              <template v-slot:after>
                                <q-icon name="remove" @click.stop="() => delete nftTypeAttributes[attrKey]"
                                  color="negative" class="cursor-pointer">
                                </q-icon>
                              </template>
                            </q-input>
                          </div>
                        </div>
                      </div>

                      <div v-if="tokenSpec.nftCollectionType == NFTCollectionType.parsable"
                        class="col-12 q-gutter-y-sm">
                        <label>Fields</label>
                        <q-input v-model="nftType.fields![0]" outlined>
                          <template v-slot:prepend>
                            <i></i>
                          </template>
                        </q-input>
                        <q-input v-for="field, i in nftType.fields!.slice(1)" v-model="nftType.fields![i + 1]"
                          :key="'field' + i" outlined>
                          <template v-slot:after>
                            <q-btn icon="remove" text-color="negative"
                              @click="nftType.fields!.splice(i + 1, 1)"></q-btn>
                          </template>
                        </q-input>
                        <div class="text-right">
                          <q-btn @click="nftType.fields!.push('')" icon="add" text-color="primary">
                          </q-btn>
                        </div>
                      </div>
                    </template>
                  </q-form>
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
  </div>
</template>

<script setup lang="ts">

import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, toRaw, unref, watch } from 'vue'
import { IdentitySnapshot, NFTCapability, NftType, TokenI, UtxoI, Wallet, delay } from 'mainnet-js'
import { ADDRESS_WATCHER_TRIGGERED, AuthGuard, AuthKey, Bcmr, CashToken, DEFAULT_TOKEN_VALUE, GenesisInput, MAX_FUNGIBLE_AMOUNT, Watchtower } from 'src/app'
import { useEventBus } from 'src/composables'
import { DialogChainObject, useQuasar } from 'quasar'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import NftAttributeDialog from 'src/components/dialogs/NftAttributeDialog.vue'
import BusyButton from 'src/components/BusyButton.vue'
import AddUriDialog from 'src/components/dialogs/AddUriDialog.vue'
import { useUser } from 'src/stores/user'
import { shortenAddress, shortenTx, formatCommitment } from 'src/app/utils'
import { IconStorageArtifact } from 'src/app/types'
import { useRoute, useRouter } from 'vue-router'
import { create as createBcmr } from 'src/app/bcmr'
import { ipfsToGatewayUrl } from 'src/app/utils'
import { ISODateString, NFTCollectionType } from 'src/app/bcmr/types'
import { buildGenesisTx, buildGenesisInputTx, signTx, broadcastTx } from 'src/app/transactions'
import bcmrSchema from 'src/app/bcmr/bcmr-v2.schema.json'
import { getInstance as getAuthguardInstance } from 'src/app/contracts'
import HelpDialog from 'src/components/dialogs/HelpDialog.vue'
import JsonEditor from 'json-editor-vue'
import { Draft07 } from 'json-schema-library'
import { default as reservedTokenSymbols } from 'src/app/bcmr/reserved-token-symbols-ISO-4217.json'
import { default as reservedCryptoSymbols } from 'src/app/bcmr/reserved-token-symbols-cryptocurrencies.json'

const reservedSymbols = reservedCryptoSymbols.concat(reservedCryptoSymbols)
const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const route = useRoute()
const router = useRouter()

const authKey = ref<UtxoI | null>()  // the authkey
const authKeyOptions = ref<{ value: Omit<UtxoI, 'token'> & Omit<TokenI, 'amount'> & { amount: string }, label: string }[]>()       // authKey nft token category(s)
const authKeySelectedOption = ref()  // authKey nft's token category
const authKeyOptionsLoading = ref<boolean>()
const genesisInput = ref<UtxoI>()
const useExistingAuthKey = ref<boolean>()
const tokenSpec = ref<{
  tokenType: 'ft' | 'nft' | 'hybrid',
  nftCollectionType?: NFTCollectionType,
  nftCommitmentFormat: 'decimal' | 'hex' | 'vm-number',
  token: Omit<TokenI, 'amount'> & { amount: string },  // Specs of token to be created
}>({
  tokenType: 'nft',
  nftCollectionType: NFTCollectionType.sequential,
  nftCommitmentFormat: 'decimal',
  token: {
    amount: '',
    tokenId: genesisInput.value?.txid || '',
    capability: NFTCapability.minting,
    commitment: ''
  }
})
const iconFile = ref()
const iconFileRef = ref()
const iconPreviewUrl = ref()
const iconFileUploading = ref<boolean>(false)
const iconFileUploadArtifact = ref<IconStorageArtifact>()
const tokenMetadata: any = ref<IdentitySnapshot>({
  name: '',
  description: undefined,
  uris: {
    icon: '',
    web: ''
  },
  token: {
    category: '',
    symbol: '',
    decimals: 0,
    nfts: {
      description: undefined,
      parse: {
        bytecode: '',
        types: {}
      }
    }
  }
})

const nftTypeKey = ref<string>()
const nftType = ref<NftType>({
  name: '',
  description: '',
  uris: {
    icon: '',
    asset: '',
    image: ''
  },
  fields: [],
  extensions: {
    attributes: {}
  }
})

const nftTypeJson = ref()
const justMounted = ref<boolean>()
const nftTypeAttributes = ref<{ [name: string]: string }>({})
const nftIconFile = ref()
const nftIconFileRef = ref()
const nftIconPreviewUrl = ref()
const nftIconUploading = ref<boolean>(false)
const assetFile = ref()
const assetFileRef = ref()
const assetPreviewUrl = ref()
const assetFileUploading = ref<boolean>(false)
const editor = ref<'form' | 'json'>()

const showAdvancedOptions = ref<boolean>() // TODO

const nftCapabilityOptions = computed(() => {
  if (tokenSpec.value.nftCollectionType) {
    return [
      { value: NFTCapability.minting, label: 'Minting (Recommended, Most use cases)' },
      { value: NFTCapability.mutable, label: 'Mutable' }
    ]
  }
  return [
    { value: NFTCapability.none, label: 'None' }
  ]
})

const tokenAmountRules = [
  (v: string) => v.split('.').length <= 2 || 'Invalid format',
  (v: string) => BigInt(v.replace('.', '')) <= BigInt(MAX_FUNGIBLE_AMOUNT) || 'Number greater than max allowed',
  (v: string) => BigInt(v.replace('.', '')) > 0 || 'Should be greater than 0'
]

const commitmentRules = [
  ((v: any) => {
    if (v == undefined || v == '') { return true }
    else {
      return tokenSpec.value.nftCommitmentFormat == 'decimal' ? /\d/g.test(v) : /^[0-9a-fA-F]+$/g.test(v)
    }

  }) || 'Invalid value'
]

const symbolRules = [
  (v: any) => !!v || 'Required',
  (v: any) => /^[-A-Z0-9]+$/.test(v) || 'Invalid value.Symbol should only contain capitals letters A-Z, numbers 0-9 or -',
  (v: any) => !reservedSymbols.includes(v) || 'Symbol is reserved',
]


const form = ref()
const disableForm = ref<'' | 'disabled'>()
const progress = ref<string | boolean>()



watch(() => useExistingAuthKey.value, async (yes) => {
  if (yes) {
    authKeyOptionsLoading.value = true
    const authKeys = (await user.wallet!.getAddressUtxos())
      .filter((u: UtxoI) => u.token && u.token.commitment == '00')
    authKeyOptions.value = authKeys.map((u: UtxoI) => {
      const clone: any = structuredClone(u)
      clone.token.amount = (clone.token.amount || 0).toString()
      const v = {
        label: shortenTx(u.token!.tokenId),
        value: clone
      }
      return v
    })
    authKeySelectedOption.value = authKeyOptions.value[0]
    authKey.value = authKeySelectedOption.value.value
    authKeyOptionsLoading.value = false
  } else {
    authKey.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) =>
      u.vout == 0 &&
      !u.token &&
      u.satoshis >= DEFAULT_TOKEN_VALUE &&
      u.txid != genesisInput.value!.txid
    )[0]
  }
})

watch(() => authKeySelectedOption.value, (v) => {
  authKey.value = v.value
})

watch(() => iconFile.value, async (b) => {
  if (b) await uploadIconToIpfs()
})

watch(() => tokenSpec.value.tokenType, (v) => {
  if (v == 'ft' || v == 'hybrid' && !tokenSpec.value.token.amount) {
    tokenSpec.value.token.amount = MAX_FUNGIBLE_AMOUNT
  } else {
    tokenSpec.value.token.amount = '0'
  }
})

watch(() => genesisInput.value, (v) => {
  if (v) {
    tokenMetadata.value.token.category = v.txid
  }
})

watch(() => tokenMetadata.value.token?.decimals, (v) => {
  if (
    Number(v) > 0
  ) {
    let newTokenAmt = tokenSpec.value.token.amount
    if (tokenSpec.value.token.amount.includes('.'))// TODO: DECIMAL AMOUNT NOT UPDATING WHEN MODIFYING decimals and the input already has .) 
    {
      newTokenAmt = tokenSpec.value.token.amount.replace('.', '')

    }
    if (
      newTokenAmt >= MAX_FUNGIBLE_AMOUNT ||
      Number(`${newTokenAmt.toString()}`.padEnd(newTokenAmt.toString().length + Number(v), '0')) >= Number(MAX_FUNGIBLE_AMOUNT)
    ) {
      // don't pad, accomodate
      const decimal_place = newTokenAmt.toString().length - Number(v)
      const whole = newTokenAmt.toString().substring(0, decimal_place)
      const decimal = newTokenAmt.toString().substring(decimal_place)
      return tokenSpec.value.token.amount = `${whole}.${decimal}`
    }
    tokenSpec.value.token.amount = `${newTokenAmt.toString()}.`.padEnd(`${newTokenAmt.toString()}`.length + Number(v) + 1, '0')
  } else {
    tokenSpec.value.token.amount = tokenSpec.value.token.amount.replace('.', '')
  }
})

watch(() => tokenSpec.value.token.amount, (v) => {
  if (Number(v) > 0 && v.includes('.')) {
    if (!tokenMetadata.value.token!.decimals) {
      tokenMetadata.value.token!.decimals = v.split('.')[1].length
    }
  } else {
    tokenMetadata.value.token!.decimals = 0
  }
})

watch(() => route.query, (v) => {
  if (['nft', 'ft', 'hybrid'].includes(v.tokenType as string)) {
    tokenSpec.value.tokenType = v.tokenType as 'nft' | 'ft' | 'hybrid'
  }
})

watch(() => nftIconFile.value, async (v) => {
  if (v) await uploadNftIconToIpfs()
})

watch(() => assetFile.value, async (v) => {
  if (v) await uploadNftAssetToIpfs()
})

watch(() => nftTypeAttributes.value, async (v) => {
  nftType.value.extensions = !nftType.value.extensions ? { attributes: v } : { ...nftType.value.extensions, attributes: v }
  if (nftTypeJson.value) {
    let nftTypeParsed = nftTypeJson.value
    if (typeof (nftTypeJson.value) == 'string') {
      nftTypeParsed = JSON.parse(nftTypeJson.value)
    }
    nftTypeParsed.extensions = !nftTypeParsed.extensions ? { attributes: v } : { ...nftTypeParsed.extensions, attributes: v }
    nftTypeJson.value = JSON.stringify(nftTypeParsed)
  }
})

watch(() => editor.value, async (v) => {
  if (v == 'json') {
    justMounted.value = false
    nftTypeJson.value = JSON.parse(JSON.stringify(nftType.value))
  } else {
    if (justMounted.value) return
    if (nftTypeJson.value) {
      if (typeof (nftTypeJson.value) == 'string') {
        nftType.value = JSON.parse(nftTypeJson.value)
      } else {
        nftType.value = nftTypeJson.value
      }
    }

    if (nftType.value.extensions?.attributes) {
      for (const [k, v] of Object.entries(nftType.value.extensions?.attributes || {})) {
        if (typeof (v) == 'string') {
          nftTypeAttributes.value[k] = v
        }
      }
    }
  }
})

const setFtSupplyToMax = () => {
  tokenSpec.value.token!.amount = MAX_FUNGIBLE_AMOUNT
}

const uploadIconToIpfs = async () => {
  if (iconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', iconFile.value);
      console.log(iconFile.value)
      if (iconPreviewUrl.value) {
        URL.revokeObjectURL(iconPreviewUrl.value)
      }
      iconPreviewUrl.value = URL.createObjectURL(iconFile.value)
      iconFileUploading.value = true
      const resp = await fetch(`api/tokens/icon/upload?tokenId=${genesisInput.value!.txid}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      tokenMetadata.value.uris!.icon = respJson.iconUris?.https
    } catch (error) {
      console.log(error)
    } finally {
      iconFileUploading.value = false
    }
  }
}

const uploadNftAssetToIpfs = async () => {
  if (assetFile.value) {
    try {
      const formData = new FormData();
      formData.append('file', assetFile.value);
      if (assetPreviewUrl.value) {
        URL.revokeObjectURL(assetPreviewUrl.value)
      }
      assetPreviewUrl.value = URL.createObjectURL(assetFile.value)
      assetFileUploading.value = true
      const resp = await fetch(`api/tokens/nft/asset-upload?tokenId=${genesisInput.value!.txid}&commitment=${nftTypeKey.value || ''}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      nftType.value.uris!.asset = respJson.uris?.ipfs
    } catch (error) {
      console.log(error)
    } finally {
      assetFileUploading.value = false
    }
  }
}

const uploadNftIconToIpfs = async () => {
  if (nftIconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', nftIconFile.value);
      console.log(nftIconFile.value)
      if (nftIconPreviewUrl.value) {
        URL.revokeObjectURL(nftIconPreviewUrl.value)
      }
      nftIconPreviewUrl.value = URL.createObjectURL(nftIconFile.value)
      nftIconUploading.value = true
      const resp = await fetch(`api/tokens/icon/upload?tokenId=${genesisInput.value!.txid}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      nftType.value.uris!.icon = respJson.iconUris?.https
    } catch (error) {
      console.log(error)
    } finally {
      nftIconUploading.value = false
    }
  }
}

const openAddUriDialog = (uri: any) => {
  $q.dialog({
    component: AddUriDialog,
    componentProps: {
      name: uri.name,
      value: uri.value
    },
    ok: { label: 'Add' },
    cancel: { label: 'Cancel' }
  }).onOk((uri) => {
    tokenMetadata.value.uris = {
      ...tokenMetadata.value.uris,
      ...uri
    }
  })
}

const openAttributeDialog = () => {
  $q.dialog({
    component: NftAttributeDialog,
  }).onOk((attribute) => {
    nftTypeAttributes.value = { ...nftTypeAttributes.value, [attribute.name]: attribute.value }
  })
}

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
      }
    }
  } catch (error) {
    $q.dialog({
      component: TransactionStatusDialog,
      componentProps: {
        message: error,
        type: 'error'
      },
      ok: true
    })
  } finally {
    progress.value = false
  }
}

const generateAuthKeyGenesisInput = async () => {
  try {
    progress.value = 'Generating auth key genesis input'
    const { decoded, sourceOutputs } = await buildGenesisInputTx({ wallet: user.wallet as Wallet })
    const signingResult = await signTx({
      signer: user.transactionSigner!,
      decodedTx: decoded, sourceOutputs: sourceOutputs,
      prompt: 'Create genesis input'
    })
    if (signingResult?.signedTransaction) {
      const tx = await broadcastTx(signingResult)
      if (tx) {
        await user.wallet?.waitForTransaction({ txHash: tx })
        authKey.value = (await user.wallet?.getAddressUtxos())?.filter((u: UtxoI) =>
          !u.token &&
          u.vout == 0 &&
          u.satoshis >= DEFAULT_TOKEN_VALUE &&
          u.txid != genesisInput.value?.txid
        )[0]
      }
    }

  } catch (error) {
    $q.dialog({
      component: TransactionStatusDialog,
      componentProps: {
        message: error,
        type: 'error'
      },
      ok: true
    })
  } finally {
    progress.value = false
  }
}

const convertCommitment = () => {
  if (tokenSpec.value.token.commitment) {
    const newFormat = tokenSpec.value.nftCommitmentFormat == 'hex' ? 'decimal' : 'hex'
    tokenSpec.value.token.commitment = formatCommitment(tokenSpec.value.token.commitment, tokenSpec.value.nftCommitmentFormat, newFormat)
    tokenSpec.value.nftCommitmentFormat = newFormat
  }
}

const createToken = async () => {
  progress.value = 'Processing, please wait...'
  const timestamp = new Date().toISOString()
  const bcmr = createBcmr(genesisInput.value!.txid, timestamp as ISODateString)
  if (tokenSpec.value.tokenType == 'ft') {
    delete tokenMetadata.value.token.nfts
  }
  bcmr.addIdentitySnapshot(bcmr.registryIdentity as string, timestamp as ISODateString, toRaw(tokenMetadata.value))
  if (nftType.value.name) {
    bcmr.addNftType(bcmr.registryIdentity as string, timestamp as ISODateString, nftTypeKey.value || '', toRaw(nftType.value))
  } else {
    delete bcmr.identities![bcmr.registryIdentity as string][timestamp].token!.nfts
  }
  bcmr.appendAuthGuardTokenStandardExtension(authKey.value?.token?.tokenId || authKey.value!.txid)
  const d = new Draft07(bcmrSchema)
  const errors: any = d.validate(JSON.parse(bcmr.getContent()))
  if (errors.length > 0) {
    $q.dialog({
      message: 'Invalid metadata, make sure you filled up the required (*) fields.',
      class: 'text-justify q-pa-lg'
    })
    progress.value = false
    return
  }

  try {
    const artifact = await bcmr.storeRegistry()
    if (!artifact) {
      $q.dialog({
        message: `Failed storing metadata in IPFS, please try again later...`
      })
      return
    }
    let { amount, commitment, tokenId, capability } = tokenSpec.value.token
    tokenId = genesisInput.value!.txid
    if (tokenSpec.value.tokenType != 'ft') {
      if (commitment) {
        commitment = formatCommitment(commitment, tokenSpec.value.nftCommitmentFormat, 'vm-number')
      } else {
        commitment = ''
      }
    }
    progress.value = 'Preparing transaction, please wait...'
    const aKey = toRaw(authKey.value!)
    if (aKey.token) {
      aKey.token!.amount = BigInt(aKey.token!.amount)
    } else {
      delete aKey.token
    }

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
          successMsg: `${tokenMetadata.value?.token?.symbol} Token Created!`
        })
        $q.dialog({
          component: TransactionStatusDialog,
          componentProps: {
            statusType: 'success',
            statusText: `${tokenMetadata.value?.token?.symbol} Token Created!`,
            txid: tx
          }
        }).onOk(() => {
          if (tokenSpec.value.tokenType == 'nft' || tokenSpec.value.tokenType == 'hybrid') {
            router.push({ name: 'nft-collection' })
          } else {
            router.push({ name: 'ft-reserves' })
          }

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
  genesisInput.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) => u.vout == 0 && !u.token && u.satoshis >= DEFAULT_TOKEN_VALUE)[0]
  if (genesisInput.value) {
    authKey.value = (await user.wallet!.getAddressUtxos()).filter((u: UtxoI) =>
      u.vout == 0 &&
      !u.token &&
      u.satoshis >= DEFAULT_TOKEN_VALUE &&
      u.txid != genesisInput.value!.txid
    )[0]
  }
})

onMounted(() => {
  showAdvancedOptions.value = false
})

</script>