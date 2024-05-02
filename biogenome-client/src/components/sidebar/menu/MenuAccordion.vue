<template>
  <va-accordion v-model="accordionValue" class="sidebar-accordion va-sidebar__menu__inner" multiple>
    <va-collapse v-for="(route, idx) in items" :key="idx">
      <template #header>
        <va-sidebar-item :active="isRouteActive(route)" @click="toRoute(route.name)">
          <va-sidebar-item-content>
            <va-icon :name="route.icon" class="va-sidebar-item__icon" />

            <va-sidebar-item-title>
              {{ t(route.displayName) }}
            </va-sidebar-item-title>

          </va-sidebar-item-content>
        </va-sidebar-item>
      </template>
    </va-collapse>
  </va-accordion>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { INavigationRoute } from '../NavigationRoutes'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'


const router = useRouter()
const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    items?: INavigationRoute[]
  }>(),
  {
    items: () => [],
  },
)
const accordionValue = ref<boolean[]>([])

function isRouteActive(item: INavigationRoute) {
  return item.name === useRoute().name || useRoute().meta.name === item.name
}

function toRoute(routeName: string) {
  if (!routeName) return
  router.push({ name: routeName })
}

</script>
