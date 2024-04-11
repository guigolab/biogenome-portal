<template>
  <va-dropdown
    v-for="(route, idx) in items"
    :key="idx"
    v-model="dropdownsValue[idx]"
    placement="right-start"
    prevent-overflow
    :offset="[1, 0]"
  >
    <template #anchor>
      <va-sidebar-item :active="isRouteActive(route)" :to="{ name: route.name }">
        <va-sidebar-item-content>
          <va-icon :name="route.meta.icon" class="va-sidebar-item__icon" />
          <va-icon
            v-if="route.children"
            class="more_icon"
            :name="dropdownsValue[idx] ? 'chevron_left' : 'chevron_right'"
          />
        </va-sidebar-item-content>
      </va-sidebar-item>
    </template>
  </va-dropdown>
</template>

<script setup lang="ts">
  import { INavigationRoute } from '../NavigationRoutes'
  import { ref } from 'vue'
  import { useRoute } from 'vue-router'

  withDefaults(
    defineProps<{
      items?: INavigationRoute[]
    }>(),
    {
      items: () => [],
    },
  )

  const dropdownsValue = ref([])

  // function isGroup(item: INavigationRoute) {
  //   return !!item.children
  // }

  function isRouteActive(item: INavigationRoute) {
    return item.name === useRoute().name || useRoute().fullPath.includes(item.name)
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
