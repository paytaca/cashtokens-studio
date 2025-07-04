<template>
  <div class="row q-gutter-sm q-pa-lg text-lg">
    <div class="col-xs-12">
      <q-banner class="rounded-borders text-grey-4 q-pa-sm"
        style="border: 3px solid rgb(73, 72, 72);border-radius: 15px; line-height: 1.3em;background: linear-gradient(109.6deg, rgb(0, 37, 84) 11.2%, rgba(0, 37, 84, 0.32) 100.2%);">
        <div class="row items-center q-p-sm">
          <div class="col">
            <q-chip size="1.5em" class="bg-transparent">
              <q-avatar>
                <q-img v-if="tokenIconUri" :src="ipfsToGatewayUrl(tokenIconUri)" />
                <q-icon v-else name="broken_image" color="grey-8"></q-icon>
              </q-avatar>
              <span style="letter-spacing: 5px;">
                {{ tokenSymbol }}
              </span>
            </q-chip>
          </div>
        </div>
      </q-banner>
    </div>
    <div class="col-xs-12">
      <q-img :src="ipfsToGatewayUrl(nftType?.uris?.icon || '')" class="rounded-borders" fit="fill" :ratio="1"
        style="max-height: 400px;"></q-img>
    </div>
    <div class="col-xs-12 q-gutter-sm">
      <div>Name</div>
      <div class="word-break-all bg-grey-10 q-pa-sm rounded-borders">{{ nftType.name }}</div>
    </div>
    <div class="col-xs-12 q-gutter-sm">
      <div>Description</div>
      <div class="word-break-all bg-grey-10 q-pa-sm rounded-borders">{{ nftType.description }}</div>
    </div>
    <template v-if="Object.keys(nftType.uris || {}).length > 0">
      <div v-for="uriName, i in Object.keys(nftType.uris!)" class="col-xs-12 q-gutter-sm" :key="i">
        <div v-if="uriName != 'icon'" class="text-capitalize">{{ uriName }}</div>
        <div v-if="uriName != 'icon'" class="word-break-all bg-grey-10 q-pa-sm rounded-borders">
          <a :href=ipfsToGatewayUrl(nftType.uris![uriName]) target="_blank" rel="noopener noreferrer">
            <span class="text-primary word-break-all">{{ nftType.uris![uriName] }}</span>
          </a>
        </div>
      </div>
    </template>
    <div v-if="nftType.extensions" class="col-xs-12 q-gutter-sm">
      <div>Extensions</div>
      <div class="word-break-all bg-grey-10 q-pa-sm rounded-borders">{{ nftType.extensions }}</div>
    </div>
    <div v-if="nftType.fields" class="col-xs-12 q-gutter-sm">
      <div>Fields</div>
      <div class="word-break-all bg-grey-10 q-pa-sm rounded-borders">{{ nftType.fields }}</div>
    </div>
    <div v-if="utxo" class="col-xs-12 q-gutter-sm">
      <div>Utxo</div>
      <div class="word-break-all bg-grey-10 q-pa-sm rounded-borders">{{ utxo }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NftType, TokenCategory, UtxoI } from 'mainnet-js'
import { ipfsToGatewayUrl, isTokenAddress } from 'src/apps/utils'

defineProps<{
  tokenSymbol: string,
  tokenIconUri: string,
  tokenCategory: string,
  nftTypeKey: string,
  nftType: NftType,
  utxo?: UtxoI
}>()


</script>