<template>
  <va-accordion v-model="accordionValue" class="sidebar-accordion va-sidebar__menu__inner" multiple>
    <va-collapse v-for="(route, idx) in items" :key="idx">
      <template #header>
        <va-sidebar-item :active="isRouteActive(route)" @click="route.children?.length ? undefined : toRoute(route.name)">
          <va-sidebar-item-content>
            <va-icon :name="route.meta.icon" class="va-sidebar-item__icon" />

            <va-sidebar-item-title>
              {{ t(route.displayName) }}
            </va-sidebar-item-title>

            <va-icon v-if="route.children" :name="accordionValue[idx] ? 'expand_less' : 'expand_more'" />
          </va-sidebar-item-content>
        </va-sidebar-item>
      </template>
      <template v-for="(child, index) in route.children" :key="index">
        <va-sidebar-item :active="isRouteActive(child)" @click="toRoute(child.name)">
          <va-sidebar-item-content>
            <div class="va-sidebar-item__icon" />

            <va-sidebar-item-title>
              {{ t(child.displayName) }}
            </va-sidebar-item-title>
          </va-sidebar-item-content>
        </va-sidebar-item>
      </template>
    </va-collapse>
  </va-accordion>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { INavigationRoute } from '../NavigationRoutes'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { useGlobalStore } from '../../../stores/global-store'
  import { storeToRefs } from 'pinia'

  const GlobalStore = useGlobalStore()

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

  const {isSidebarMinimized} = storeToRefs(GlobalStore)

  const accordionValue = ref<boolean[]>([])

  onMounted(() => {
    accordionValue.value = props.items.map((item) => isItemExpanded(item))
  })

  function isRouteActive(item: INavigationRoute) {
    return item.name === useRoute().name || useRoute().fullPath.includes(item.name)
  }

  function toRoute(routeName: string) {
    if(!routeName) return
    if(!isSidebarMinimized.value){
      isSidebarMinimized.value = true
    }
    router.push({ name: routeName })

  }
  function isItemExpanded(item: INavigationRoute): boolean {
    if (!item.children) {
      return false
    }

    const isCurrentItemActive = isRouteActive(item)
    const isChildActive = !!item.children.find((child) =>
      child.children ? isItemExpanded(child) : isRouteActive(child),
    )

    return isCurrentItemActive || isChildActive
  }
</script>
