<template>
   <VaNavbarItem class="navbar-mobile">
      <VaDropdown v-model="showMobileMenu" :close-on-content-click="false" placement="bottom-start">
         <template #anchor>
            <VaButton icon="fa-bars" :color="textColor" preset="secondary" size="large" />
         </template>
         <div class="navbar-mobile__menu">
            <VaButton preset="secondary" class="navbar-mobile__item" @click="goHome">
               {{ t('nav.home') }}
            </VaButton>
            <VaButton preset="secondary" class="navbar-mobile__item" @click="toggleMobileDropdown('data')">
               {{ t('nav.data') }}
            </VaButton>
            <div v-show="mobileDropdown === 'data'" class="navbar-mobile__submenu">
               <VaButton
                  v-for="model in models"
                  :key="model.value"
                  preset="secondary"
                  class="navbar-mobile__item"
                  @click="goModel(model.value)"
               >
                  {{ t(`models.${model.text}`) }}
               </VaButton>
            </div>
            <VaButton preset="secondary" class="navbar-mobile__item" @click="toggleMobileDropdown('tools')">
               {{ t('nav.tools') }}
            </VaButton>
            <div v-show="mobileDropdown === 'tools'" class="navbar-mobile__submenu">
               <template v-for="item in toolsItems" :key="isNavLink(item) ? item.routeName : item.actionId">
                  <VaButton
                     v-if="isNavLink(item)"
                     preset="secondary"
                     class="navbar-mobile__item"
                     @click="goRoute(item.routeName)"
                  >
                     {{ t(item.labelKey) }}
                  </VaButton>
                  <VaButton
                     v-else-if="isNavAction(item)"
                     preset="secondary"
                     class="navbar-mobile__item"
                     @click="downloadGoatReport"
                  >
                     {{ t(item.labelKey) }}
                  </VaButton>
               </template>
            </div>
            <VaButton preset="secondary" class="navbar-mobile__item" @click="toggleMobileDropdown('settings')">
               {{ t('nav.settings') }}
            </VaButton>
            <div v-show="mobileDropdown === 'settings'" class="navbar-mobile__submenu">
               <a
                  v-for="link in settingsItems"
                  :key="link.label"
                  :href="link.href"
                  target="_blank"
                  class="navbar-mobile__item"
               >
                  {{ link.label }}
               </a>
            </div>
            <VaButton v-if="hasCMS" preset="secondary" class="navbar-mobile__item" @click="goRoute('admin')">
               {{ btnLabel }}
            </VaButton>
            <VaButton preset="secondary" class="navbar-mobile__item" @click="toggleMobileDropdown('lang')">
               {{ locale }}
            </VaButton>
            <div v-show="mobileDropdown === 'lang'" class="navbar-mobile__submenu">
               <VaButton
                  v-for="lang in languages"
                  :key="lang.code"
                  preset="secondary"
                  class="navbar-mobile__item"
                  @click="handleLang(lang)"
               >
                  {{ t(`language.${lang.name}`) }}
               </VaButton>
            </div>
         </div>
      </VaDropdown>
   </VaNavbarItem>
</template>

<script setup lang="ts">
   import { useRouter } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import { ref } from 'vue'
   import type { NavLinkItem, NavActionItem } from '../composable/useNavConfig'
   import { isNavLink, isNavAction } from '../composable/useNavConfig'

   interface Model {
      value: string
      text: string
   }
   interface Language {
      code: string
      name: string
   }
   interface SettingsLink {
      href: string
      label: string
   }

   const props = defineProps<{
      mobileDropdown: string
      models: Model[]
      toolsItems: (NavLinkItem | NavActionItem)[]
      settingsItems: SettingsLink[]
      languages: Language[]
      config: Record<string, any>
      hasGoat: Boolean
      externalLink: string
      hasCMS: Boolean
      locale: string
      btnLabel: string
      textColor: string
   }>()

   const emit = defineEmits(['update:showMobileMenu', 'update:mobileDropdown', 'downloadGoatReport', 'handleLang'])
   const router = useRouter()
   const { t } = useI18n()
   const showMobileMenu = ref(false)
   function goHome() {
      router.push({ name: 'home' })
      emit('update:showMobileMenu', false)
   }
   function goModel(model: string) {
      router.push({ name: 'model', params: { model } })
      emit('update:showMobileMenu', false)
   }
   function goRoute(name: string) {
      router.push({ name })
      emit('update:showMobileMenu', false)
   }
   function toggleMobileDropdown(section: string) {
      emit('update:mobileDropdown', props.mobileDropdown === section ? '' : section)
   }
   function downloadGoatReport() {
      emit('downloadGoatReport')
      emit('update:showMobileMenu', false)
   }
   function handleLang(lang: Language) {
      emit('handleLang', lang)
      emit('update:showMobileMenu', false)
   }
</script>

<style scoped lang="scss">
   /* Align with Navbar dropdown and DataExplorerLayout/DataLayout panel styles */
   .navbar-mobile {
      display: flex;
      align-items: center;
      justify-content: center;
   }

   .navbar-mobile__menu {
      min-width: 220px;
      padding: 1rem 0.5rem;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
   }

   .navbar-mobile__submenu {
      padding-left: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
   }

   .navbar-mobile__item {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--va-text-primary);
      text-decoration: none;
      display: block;
      border-radius: 8px;
      transition: background 0.2s ease, color 0.2s ease;
      cursor: pointer;

      &:hover {
         background: var(--va-background-element);
         color: var(--va-primary);
      }

      &:active {
         background: var(--va-background-secondary);
      }
   }

   a.navbar-mobile__item {
      box-sizing: border-box;
   }
</style>
