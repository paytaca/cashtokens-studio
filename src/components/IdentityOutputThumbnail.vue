<template>
  <q-card bordered class="token-thumbnail" @click="router.push('/token/view?tokenId=' + tokenId)">
    <q-card-title class="ellipsis justify-center row text-caption q-mt-xs" bordered>
      <q-btn @click.stop="() => copyText(tokenId)" flat dense rounded>
        <code>
                                {{ tokenId.replace(tokenId.substring(5, 60), '...') }}
                                <q-tooltip>Click to copy token id</q-tooltip>
                              </code>
      </q-btn>
    </q-card-title>
    <q-card-section>
      <div class="row items-end justify-left">
        <div class="col-12">
          <q-skeleton v-if="!icon && loading" type="QAvatar"></q-skeleton>
          <q-avatar v-if="icon" square rounded>
            <img :src="icon" alt="">
          </q-avatar>
          <q-avatar v-if="!icon && !loading" square rounded>
            <q-icon name="token"></q-icon>
          </q-avatar>
        </div>
        <div class="col-12 justify-center row q-mt-xs">
          <q-skeleton v-if="!symbol && loading" type="QChip"></q-skeleton>
          <q-chip v-if="symbol" color="orange" outline>
            {{ symbol }}
          </q-chip>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">

import { useRouter } from 'vue-router'
import copyText from 'src/utils/copyText'

defineOptions({ name: 'IdentityOutputThumbnail' })
const router = useRouter()
// const props = defineProps(['tokenId', 'icon', 'symbol', 'name', 'blank', 'loading'])
defineProps<{ tokenId: string, icon?: string, symbol?: string, loading?: boolean }>()
</script>
