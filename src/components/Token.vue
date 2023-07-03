<template>
  <div>{{ token }}</div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';

export default defineComponent({
  props: ['token']
})

</script>