<template>
  <div class="app-navbar-actions">
    <LanguageDropdown class="app-navbar-actions__item" />
    <ProfileDropdown v-if="cms" class="app-navbar-actions__item app-navbar-actions__item--profile">
      <va-chip icon="settings" flat color="primary" v-if="globalStore.isAuthenticated"
        :to="{ name: 'cms-organisms' }">{{ userName }}</va-chip>
    </ProfileDropdown>
  </div>
</template>

<script setup lang="ts">
import LanguageDropdown from './dropdowns/LanguageDropdown.vue'
import ProfileDropdown from './dropdowns/ProfileDropdown.vue'
import { useGlobalStore } from '../../../stores/global-store'
import { cms } from "../../../../config.json";

const globalStore = useGlobalStore()

withDefaults(
  defineProps<{
    userName?: string
    isTopBar?: boolean
  }>(),
  {
    userName: '',
    isTopBar: false,
  },
)

defineEmits<{
  (e: 'update:isTopBar', isTopBar: boolean): void
}>()

</script>

<style lang="scss">
.app-navbar-actions {
  display: flex;
  align-items: center;

  .va-dropdown__anchor {
    color: var(--va-primary);
    fill: var(--va-primary);
  }

  &__item {
    padding: 0;
    margin-left: 1.25rem;
    margin-right: 1.25rem;

    svg {
      height: 24px;
    }

    &:last-of-type {
      margin-right: 0;
    }

    &--profile {
      display: flex;
      justify-content: center;
      margin: auto 0 auto 1.25rem;
    }

    .va-dropdown-content {
      background-color: var(--va-white);
    }

    @media screen and (max-width: 640px) {
      margin-right: 0;

      &:first-of-type {
        margin-left: 0;
      }

      &--profile {
        position: absolute;
        right: 0.75rem;
        top: 1.25rem;
        height: fit-content;
        margin: auto;
      }
    }
  }
}
</style>
