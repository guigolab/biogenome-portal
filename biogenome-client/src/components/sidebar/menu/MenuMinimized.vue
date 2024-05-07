<template>
  <va-sidebar-item v-for="(route, idx) in items" :key="idx" :active="isRouteActive(route)" @click="toRoute(route.name)">
    <va-sidebar-item-content>
      <va-icon :name="route.icon" class="va-sidebar-item__icon" />
    </va-sidebar-item-content>
  </va-sidebar-item>
</template>

<script setup lang="ts">
import { INavigationRoute } from '../NavigationRoutes'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
withDefaults(
  defineProps<{
    items?: INavigationRoute[]
  }>(),
  {
    items: () => [],
  },
)

function isRouteActive(item: INavigationRoute) {
  return item.name === useRoute().name || useRoute().meta.name === item.name
}

function toRoute(routeName: string) {
  if (!routeName) return
  router.push({ name: routeName })
}

</script>

<style lang="scss">
.sidebar-item {
  &__children {
    max-height: 60vh;
    overflow-y: auto;
    overflow-x: visible;
    width: 16rem;
    color: var(--va-gray);
    background: var(--va-white, #fff);
    box-shadow: var(--va-box-shadow);
  }
}

.va-sidebar-item {
  &-content {
    position: relative;

    .more_icon {
      text-align: center;
      position: absolute;
      bottom: 0.5rem;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
    }
  }
}
</style>
