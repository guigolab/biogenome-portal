<template>
  <va-sidebar :width="width" :minimized="minimized" :minimized-width="minimizedWidth" :animated="animated">
    <div class="row justify-center align-center" v-if="navBar.logoName">
      <div class="flex logo">
        <a :href="navBar.url" target="_blank"><va-icon color="success" :size="minimized? '2rem' :'4rem'" name=app-logo></va-icon></a>
      </div>
    </div>
    <menu-minimized v-if="minimized" :items="items" />
    <menu-accordion v-else :items="items" />
  </va-sidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import NavigationRoutes from './NavigationRoutes'
import MenuAccordion from './menu/MenuAccordion.vue'
import MenuMinimized from './menu/MenuMinimized.vue'
import { useGlobalStore } from '../../stores/global-store'
import { navBar } from '../../../config.json'
const GlobalStore = useGlobalStore()

withDefaults(
  defineProps<{
    width?: string
    color?: string
    animated?: boolean
    minimized?: boolean
    minimizedWidth?: string
  }>(),
  {
    width: '100wv',
    color: 'secondary',
    animated: true,
    minimized: true,
    minimizedWidth: undefined,
  },
)

const items = computed(() => {
  return GlobalStore.isAuthenticated
    ? NavigationRoutes.routes
    : NavigationRoutes.routes.filter((r) => r.name !== 'forms')
})
</script>

<style lang="scss">
.logo {
  padding-bottom: 10px;
}
.va-sidebar {
  width: 100%;

  &__menu {
    padding: 2rem 0;
  }

  &-item {
    &__icon {
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
