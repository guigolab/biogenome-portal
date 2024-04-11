<template>
  <va-sidebar :width="width" :minimized="minimized" :minimized-width="minimizedWidth" :animated="animated">
    <div v-if="nav.logo" class="logo">
      <a :href="nav.url" target="_blank"><va-icon color="success" :size="minimized ? '2rem' : '4rem'"
          name=app-logo></va-icon></a>
    </div>
    <va-divider />
    <menu-minimized v-if="minimized" :items="items" />
    <menu-accordion v-else :items="items" />
  </va-sidebar>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NavigationRoutes from './NavigationRoutes'
import MenuAccordion from './menu/MenuAccordion.vue'
import MenuMinimized from './menu/MenuMinimized.vue'
import { nav } from '../../../config.json'


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

const items = ref(NavigationRoutes.routes)


</script>

<style lang="scss">
.logo {
  padding: 10px;
  display: flex;
  justify-content: center;
}

.va-sidebar {
  width: 100%;

  &__menu {
    padding: 0.5rem 0;
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
