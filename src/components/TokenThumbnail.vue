<template>
  <q-card bordered class="token-thumbnail" @click="router.push('/token/view')">
    <q-card-title class="ellipsis justify-center row text-caption q-my-xs" bordered>
      <code v-if="tokenId"> {{ tokenId.replace(tokenId.substring(5, 60), '...') }} </code>
      <code v-else>no id</code>
      <q-btn v-if="tokenId" icon="content_copy" size="xs" @click.stop="() => console.log('copying')" rounded flat
        dense></q-btn>
    </q-card-title>
    <q-card-section>
      <div class="row items-end justify-left">
        <div class="col-12">
          <q-avatar square rounded>
            <img :src="iconSrc" alt="">
          </q-avatar>
        </div>
        <div class="col-12 justify-center row">
          <q-chip :color="symbol ? 'orange' : 'grey'" outline>
            {{ symbol ? symbol.toUpperCase() : 'NO-SYM' }}
          </q-chip>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<style lang="scss" scoped>
.token-thumbnail {
  cursor: pointer;
  width: 10em;
  height: 10em;
}

.token-thumbnail:hover {
  background-color: lighten($primary, 50);
}

.q-dark.token-thumbnail:hover {
  background-color: lighten($dark, 5);
}

@media (max-width: $breakpoint-xs-max) {
  .token-thumbnail {
    min-width: 10em;
    min-height: 10em;
  }
}
</style>

<script setup lang="ts">

import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({ name: 'TokenThumbnail' })
const router = useRouter()
const props = defineProps(['tokenId', 'icon', 'symbol', 'name', 'blank'])
const iconSrc = ref<string>(props.icon)
onMounted(async () => {
  if (props.icon) {
    try {
      await fetch(props.icon, { method: 'HEAD' })
    } catch (error) {
      console.log('ERROR', error)
      iconSrc.value = 'images/token.png'
    }
  }
})
</script>
