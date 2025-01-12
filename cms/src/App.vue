<template>
  <router-view></router-view>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useGlobalStore } from "./stores/global-store"


const globalStore = useGlobalStore()

onMounted(async () => {
  await globalStore.checkUserIsLoggedIn()
})

</script>

<style lang="scss">
.row-equal {
  .flex {
    .va-card {
      height: 100%;
    }
  }
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.5s ease;
}
</style>
