<template>
   <VaNavbar shadowed bordered :color="navColor" class="navbar">
      <template #left>
         <VaNavbarItem v-if="appLogo" class="navbar__logo">
            <a v-if="externalLink" class="navbar__logo-link" :href="externalLink" target="_blank">
               <VaImage fit="contain" class="navbar__logo-img" lazy :src="generatedLink" />
            </a>
            <VaImage v-else fit="contain" class="navbar__logo-img" lazy :src="generatedLink" />
         </VaNavbarItem>
         <VaNavbarItem v-else>
            <span class="navbar__title">{{ title }}</span>
         </VaNavbarItem>
      </template>
      <template #center>
         <VaNavbarItem v-show="!isMobile" class="navbar__links">
            <VaButton :to="{ name: 'home' }" :color="textColor" preset="secondary" class="navbar__btn">
               {{ t('nav.home') }}
            </VaButton>
         </VaNavbarItem>
         <VaNavbarItem v-show="!isMobile" class="navbar__links">
            <VaDropdown placement="bottom-start" v-model="showDataDropdown">
               <template #anchor>
                  <VaButton :color="textColor" preset="secondary" class="navbar__btn">
                     {{ t('nav.data') }}
                  </VaButton>
               </template>
               <div class="navbar__dropdown">
                  <div
                     v-for="model in dataModels"
                     :key="model.value"
                     class="navbar__dropdown-item"
                     role="button"
                     tabindex="0"
                     @click="navigateToModel(model.value)"
                  >
                     {{ t(`models.${model.text}`) }}
                  </div>
               </div>
            </VaDropdown>
         </VaNavbarItem>
         <VaNavbarItem v-show="!isMobile" class="navbar__links">
            <VaDropdown placement="bottom-start" v-model="showToolsDropdown">
               <template #anchor>
                  <VaButton :color="textColor" preset="secondary" class="navbar__btn">
                     {{ t('nav.tools') }}
                  </VaButton>
               </template>
               <div class="navbar__dropdown">
                  <template v-for="item in toolsItems" :key="navItemKey(item)">
                     <RouterLink
                        v-if="isNavLink(item)"
                        :to="{ name: item.routeName, params: item.params }"
                        class="navbar__dropdown-item"
                     >
                        {{ t(item.labelKey) }}
                     </RouterLink>
                     <div
                        v-else-if="isNavAction(item)"
                        class="navbar__dropdown-item"
                        role="button"
                        tabindex="0"
                        @click="handleToolsAction(item)"
                     >
                        {{ t(item.labelKey) }}
                     </div>
                  </template>
               </div>
            </VaDropdown>
         </VaNavbarItem>
         <VaNavbarItem v-show="!isMobile" class="navbar__links">
            <VaDropdown placement="bottom-start" v-model="showSettingsDropdown">
               <template #anchor>
                  <VaButton :color="textColor" preset="secondary" class="navbar__btn">
                     {{ t('nav.settings') }}
                  </VaButton>
               </template>
               <div class="navbar__dropdown">
                  <a
                     v-for="link in settingsItems"
                     :key="link.label"
                     :href="link.href"
                     target="_blank"
                     class="navbar__dropdown-item"
                  >
                     {{ link.label }}
                  </a>
               </div>
            </VaDropdown>
         </VaNavbarItem>
      </template>
      <template #right>
         <VaNavbarItem v-if="isDev" class="navbar__dev" v-show="!isMobile">
            <label class="navbar__dev-field">
               <span>P</span>
               <input v-model="devPrimary" type="color" aria-label="Primary color" />
            </label>
            <label class="navbar__dev-field">
               <span>S</span>
               <input v-model="devSecondary" type="color" aria-label="Secondary color" />
            </label>
         </VaNavbarItem>
         <MobileNavbarMenu
            v-show="isMobile"
            :mobileDropdown="mobileDropdown"
            :models="dataModels"
            :toolsItems="toolsItems"
            :settingsItems="settingsItems"
            :locale="locale"
            :languages="languages"
            :config="config"
            :btnLabel="btnLabel"
            :externalLink="externalLink"
            :hasGoat="hasGoat"
            @update:showMobileMenu="showMobileMenu = $event"
            @update:mobileDropdown="mobileDropdown = $event"
            @downloadGoatReport="downloadGoatReport"
            @handleLang="handleLang"
            :hasCMS="hasCMS"
            :textColor="textColor"
         />
         <VaNavbarItem v-if="hasCMS" class="navbar__links" v-show="!isMobile">
            <VaButton :to="{ name: 'admin' }" :color="textColor" preset="secondary" class="navbar__btn">
               {{ btnLabel }}
            </VaButton>
         </VaNavbarItem>
         <VaNavbarItem v-show="!isMobile">
            <VaDropdown placement="bottom-start" v-model="showLangDropdown">
               <template #anchor>
                  <VaButton :color="textColor" preset="secondary" class="navbar__btn">
                     {{ locale }}
                  </VaButton>
               </template>
               <div class="navbar__dropdown">
                  <div
                     v-for="lang in languages"
                     :key="lang.code"
                     class="navbar__dropdown-item"
                     role="button"
                     tabindex="0"
                     @click="handleLang(lang)"
                  >
                     {{ t(`language.${lang.name}`) }}
                  </div>
               </div>
            </VaDropdown>
         </VaNavbarItem>
      </template>
   </VaNavbar>
</template>

<script setup lang="ts">
   import { computed, inject, ref, watch } from 'vue'
   import { AppConfig, LangOption } from '../data/types'
   import { RouterLink, useRouter } from 'vue-router'
   import { useBreakpoint, useColors, useToast } from 'vuestic-ui'
   import { useI18n } from 'vue-i18n'
   import GoaTService from '../services/GoaTService'
   import { useGlobalStore } from '../stores/global-store'
   import MobileNavbarMenu from './MobileNavbarMenu.vue'
   import {
      getDataNavItems,
      getToolsNavItems,
      getSettingsNavItems,
      isNavLink,
      isNavAction,
      type NavActionItem,
      type NavLinkItem,
   } from '../composable/useNavConfig'
   import { normalizeUiColors } from '../composable/useApplicationSettings'

   const { t, locale } = useI18n()
   const breakpoint = useBreakpoint()
   const globalStore = useGlobalStore()
   const colors = useColors() as any
   const isDev = import.meta.env.DEV

   const navColor = computed(() => {
      return colors.colors.nav || 'backgroundPrimary'
   })

   const textColor = computed(() => {
      return colors.colors.navText || 'primary'
   })

   const devPrimary = ref(normalizeHex((colors.colors?.primary as string) || '#2f2f2f'))
   const devSecondary = ref(normalizeHex((colors.colors?.secondary as string) || '#1f3a5f'))

   const config = inject('appConfig') as AppConfig
   const router = useRouter()

   const { init } = useToast()

   const showDataDropdown = ref(false)
   const showToolsDropdown = ref(false)
   const showSettingsDropdown = ref(false)
   const showLangDropdown = ref(false)
   const showMobileMenu = ref(false)
   const mobileDropdown = ref('')

   const btnLabel = computed(() => (globalStore.isAuthenticated ? t('user.dashboard') : t('user.login')))
   const appLogo = config.general.logo
   const externalLink = config.general.externalLink
   const hasCMS = config.general.cms
   const hasGoat = config.general.goat
   const generatedLink = computed(() =>
      appLogo && appLogo.includes('http') ? appLogo : new URL(`/src/assets/${appLogo}`, import.meta.url).href,
   )

   const dashboardDefaultTitle = 'BioGenome Portal'

   const title = computed<LangOption | string>(
      () => (config.general.title[locale.value] as LangOption) ?? dashboardDefaultTitle,
   )
   const isMobile = computed(() => breakpoint.mdDown || breakpoint.sm || breakpoint.xs)
   const languages = computed(() => config.general.languages as { code: string; name: string }[])

   const dataModels = computed(() => getDataNavItems(config))
   const toolsItems = computed(() => getToolsNavItems(config, hasGoat))
   const settingsItems = computed(() => getSettingsNavItems(externalLink))

   function navigateToModel(model: string) {
      router.push({ name: 'model', params: { model } })
   }

   function navItemKey(item: NavLinkItem | NavActionItem): string {
      return isNavLink(item) ? item.routeName : item.actionId
   }

   function handleToolsAction(item: NavActionItem) {
      if (item.actionId === 'goat-report') downloadGoatReport()
   }

   function handleLang(lang: { code: string; name: string }) {
      locale.value = lang.code
      globalStore.changeLang(lang.code)
      showLangDropdown.value = false
   }

   async function downloadGoatReport() {
      try {
         const response = await GoaTService.getGoatReport()
         const data = response.data
         const href = URL.createObjectURL(data)
         let name = 'goat_report.tsv'
         const link = document.createElement('a')
         link.href = href
         link.setAttribute('download', name)
         document.body.appendChild(link)
         link.click()
         document.body.removeChild(link)
         URL.revokeObjectURL(href)
      } catch (err) {
         console.error(err)
         init({ message: 'Error downloading Goat Report', color: 'danger' })
      }
   }

   if (isDev) {
      watch(
         () => [devPrimary.value, devSecondary.value] as const,
         ([primary, secondary]) => {
            const palette = normalizeUiColors({
               colors: {
                  variables: { primary, secondary },
               },
            })?.colors?.variables
            applyPalette(palette as Record<string, string>)
         },
         { immediate: true },
      )
   }

   function applyPalette(palette: Record<string, string>) {
      if (!palette) return
      if (typeof colors.setColors === 'function') {
         colors.setColors(palette)
         return
      }
      Object.entries(palette).forEach(([key, value]) => {
         colors.colors[key] = value
         document.documentElement.style.setProperty(`--va-${key}`, value)
      })
   }

   function normalizeHex(hex: string): string {
      const cleaned = String(hex || '')
         .trim()
         .replace('#', '')
      if (cleaned.length === 3) {
         return `#${cleaned
            .split('')
            .map((c) => c + c)
            .join('')
            .toLowerCase()}`
      }
      if (cleaned.length !== 6) return '#2f2f2f'
      return `#${cleaned.toLowerCase()}`
   }
</script>

<style lang="scss" scoped>
   /* Shared design tokens with DataLayout, DataExplorerLayout, Tree, GenomeBrowser */
   .navbar {
      --navbar-radius: 12px;
      --navbar-radius-sm: 8px;
      --navbar-font-size: 0.875rem;
      --navbar-font-weight: 500;
      --navbar-font-meta: 0.8125rem;
   }

   .navbar__links {
      display: flex;
      align-items: center;
      gap: 1.25rem;
   }

   .navbar__btn {
      font-size: var(--navbar-font-size);
      font-weight: var(--navbar-font-weight);
      letter-spacing: 0.02em;
   }

   .navbar__title {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--va-text-primary);
   }

   .navbar__logo {
      width: 10rem;
      padding: 0;
   }

   .navbar__logo-link {
      display: block;
      height: 100%;
      width: 100%;
   }

   .navbar__logo-img {
      height: 3.5rem;
      width: 100%;
   }

   /* Dropdown panel — match data-explorer-right, tree-page__right-inner */
   .navbar__dropdown {
      min-width: 200px;
      padding: 0.5rem;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: var(--navbar-radius);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      z-index: 1000;
   }

   /* Dropdown items — match data-explorer-top__tab, tree-page__right-close hover */
   .navbar__dropdown-item {
      padding: 0.625rem 1rem;
      font-size: var(--navbar-font-size);
      font-weight: var(--navbar-font-weight);
      color: var(--va-text-primary);
      text-decoration: none;
      display: block;
      border-radius: var(--navbar-radius-sm);
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      cursor: pointer;

      &:hover {
         background: var(--va-background-element);
         color: var(--va-primary);
      }

      &:focus-visible {
         outline: 2px solid rgba(var(--va-primary-rgb, 59, 130, 246), 0.45);
         outline-offset: 2px;
      }
   }

   a.navbar__dropdown-item {
      cursor: pointer;
   }

   /* Dev color pickers — match data-explorer-top__kicker typography */
   .navbar__dev {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-right: 0.5rem;
   }

   .navbar__dev-field {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--va-text-secondary);
      cursor: pointer;
   }

   .navbar__dev-field input {
      width: 1.5rem;
      height: 1.5rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: var(--navbar-radius-sm);
      background: var(--va-background-primary);
      padding: 0;
      cursor: pointer;
      transition: border-color 0.2s ease;

      &:hover {
         border-color: var(--va-primary);
      }
   }

   @media (max-width: 576px) {
      .navbar__logo {
         width: 8rem;
      }

      .navbar__logo-img {
         height: 4rem;
      }

      .navbar__links {
         gap: 1rem;
      }
   }

   @media (min-width: 577px) and (max-width: 768px) {
      .navbar__logo {
         width: 9rem;
      }

      .navbar__logo-img {
         height: 4.5rem;
      }
   }

   @media (min-width: 769px) and (max-width: 1200px) {
      .navbar__logo {
         width: 10rem;
      }

      .navbar__logo-img {
         height: 5rem;
      }
   }
</style>
