<template>
  <va-dropdown :stickToEdges="true" class="language-dropdown" fixed position="bottom" :offset="[13, 0]">
    <template #anchor>
      <va-chip flat>
        {{ t(`language.${getLangName(locale)}`) }}
      </va-chip>
    </template>
    <va-dropdown-content class="language-dropdown__content pl-4 pr-4 pt-2 pb-2">
      <div v-for="(option, id) in options" :key="id"
        class="language-dropdown__item row align--center pt-1 pb-1 mt-2 mb-2"
        :class="{ active: option.code === locale }" @click="locale = option.code">
        <span class="dropdown-item__text">
          {{ t(`language.${option.name}`) }}
        </span>
      </div>
    </va-dropdown-content>
  </va-dropdown>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import general from '../../../../configs/general.json'
const { t, locale } = useI18n()

withDefaults(
  defineProps<{
    options?: { code: string; name: string }[]
  }>(),
  {
    options: () => general.languages
  },
)

function getLangName(code: string) {
  const currentLang = general.languages.find(l => l.code === code)
  if (currentLang) return currentLang.name
}
</script>

<style lang="scss" scoped>
.language-dropdown {
  cursor: pointer;

  &__content {
    .fi-size-small {
      min-width: 1.5rem;
      min-height: 1.5rem;
      margin-right: 0.5rem;
    }
  }

  &__item {
    padding-bottom: 0.625rem;
    cursor: pointer;
    flex-wrap: nowrap;

    &:last-of-type {
      padding-bottom: 0 !important;
    }

    &:hover {
      color: var(--va-primary);
    }
  }

  .fi::before {
    content: '';
  }

  .fi-size-large {
    display: block;
    width: 32px;
    height: 24px;
  }

  .va-dropdown__anchor {
    display: inline-block;
  }
}
</style>
