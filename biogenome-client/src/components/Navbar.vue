<template>
  <VaNavbar class="va-text-capitalize" shadowed bordered :color="navColor">
    <template #left>
      <VaNavbarItem v-if="appLogo" class="image-wrapper">
        <a v-if="externalLink" style="height: 100%;width: 100%;" :href="externalLink" target="_blank">
          <VaImage fit="contain" class="image-h" lazy :src="generatedLink">
          </VaImage>
        </a>
        <VaImage v-else fit="contain" class="image-h" lazy :src="generatedLink">
        </VaImage>
      </VaNavbarItem>
      <VaNavbarItem v-else>
        <span class="va-h6">
          {{ title }}
        </span>
      </VaNavbarItem>
    </template>
    <template #center>
      <VaNavbarItem v-show="!isMobile" class="nav-links">
        <VaButton :to="{ name: 'home' }" :color="textColor" class="va-text-uppercase"
          preset="secondary">
          {{ t('nav.home') }}
        </VaButton>
      </VaNavbarItem>
      <VaNavbarItem v-show="!isMobile" class="nav-links">
        <VaDropdown placement="bottom-start" v-model="showDataDropdown">
          <template #anchor>
            <VaButton :color="textColor" class="va-text-uppercase" preset="secondary">
              {{ t('nav.data') }}
            </VaButton>
          </template>
          <div class="dropdown-content">
            <div v-for="model in models" :key="model.value" class="dropdown-item"
              @click="router.push({ name: 'model', params: { model: model.value } })">
              {{ t(`models.${model.text}`) }}
            </div>
          </div>
        </VaDropdown>
      </VaNavbarItem>
      <VaNavbarItem v-show="!isMobile" class="nav-links">
        <VaDropdown placement="bottom-start" v-model="showToolsDropdown">
          <template #anchor>
            <VaButton :color="textColor" class="va-text-uppercase" preset="secondary">
              {{ t('nav.tools') }}
            </VaButton>
          </template>
          <div class="dropdown-content">
            <RouterLink :to="{ name: 'tree' }" class="dropdown-item">
              {{ t('nav.taxExplorer') }}
            </RouterLink>
            <RouterLink :to="{ name: 'map' }" class="dropdown-item">
              {{ t('map.title') }}
            </RouterLink>
            <RouterLink v-if="config.models.assemblies" :to="{ name: 'jbrowse' }" class="dropdown-item">
              {{ t('nav.genomeBrowser') }}
            </RouterLink>
            <div v-if="hasGoat" class="dropdown-item" @click="downloadGoatReport">
              {{ t('buttons.goat') }}
            </div>
          </div>
        </VaDropdown>
      </VaNavbarItem>
      <VaNavbarItem v-show="!isMobile" class="nav-links">
        <VaDropdown placement="bottom-start" v-model="showSettingsDropdown">
          <template #anchor>
            <VaButton :color="textColor" class="va-text-uppercase" preset="secondary">
              {{ t('nav.settings') }}
            </VaButton>
          </template>
          <div class="dropdown-content">
            <a href="https://github.com/guigolab/biogenome-portal" target="_blank" class="dropdown-item">
              GitHub
            </a>
            <a href="https://guigolab.github.io/biogenome-portal/" target="_blank" class="dropdown-item">
              Docs
            </a>
            <a v-if="externalLink" :href="externalLink" target="_blank" class="dropdown-item">
              Website
            </a>
          </div>
        </VaDropdown>
      </VaNavbarItem>
    </template>
    <template #right>
      <MobileNavbarMenu v-show="isMobile" :mobileDropdown="mobileDropdown" :models="models" :locale="locale"
        :languages="languages" :config="config" :btnLabel="btnLabel" :externalLink="externalLink" :hasGoat="hasGoat"
        @update:showMobileMenu="showMobileMenu = $event" @update:mobileDropdown="mobileDropdown = $event"
        @downloadGoatReport="downloadGoatReport" @handleLang="handleLang" :hasCMS="hasCMS" :textColor="textColor" />
      <VaNavbarItem v-if="hasCMS" class="nav-links" v-show="!isMobile">
        <VaButton :to="{ name: 'admin' }" :color="textColor" class="va-text-uppercase" preset="secondary">
          {{ t(btnLabel) }}
        </VaButton>
      </VaNavbarItem>
      <VaNavbarItem v-show="!isMobile">
        <VaDropdown placement="bottom-start" v-model="showLangDropdown">
          <template #anchor>
            <VaButton :color="textColor" class="va-text-uppercase" preset="secondary">
              {{ locale }}
            </VaButton>
          </template>
          <div class="dropdown-content">
            <div v-for="lang in languages" :key="lang.code" class="dropdown-item" @click="handleLang(lang)">
              {{ t(`language.${lang.name}`) }}
            </div>
          </div>
        </VaDropdown>
      </VaNavbarItem>
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { computed, inject, ref, onMounted, onUnmounted } from 'vue';
import { AppConfig, LangOption } from '../data/types';
import { RouterLink, useRouter } from 'vue-router';
import { useBreakpoint, useColors, useToast } from 'vuestic-ui';
import { useI18n } from 'vue-i18n';
import GoaTService from '../services/GoaTService';
import { useGlobalStore } from '../stores/global-store';
import MobileNavbarMenu from './MobileNavbarMenu.vue';


const { t, locale } = useI18n()
const breakpoint = useBreakpoint()
const globalStore = useGlobalStore()
const colors = useColors()


const navColor = computed(() => {
  return colors.colors.nav || 'backgroundPrimary'
})

const textColor = computed(() => {
  return colors.colors.navText || 'primary'
})

onMounted(() => {
  console.log(colors.colors)
})

const config = inject('appConfig') as AppConfig
const router = useRouter()
const generalConfigs = ['general', 'ui']

const { init } = useToast()

const showDataDropdown = ref(false)
const showToolsDropdown = ref(false)
const showSettingsDropdown = ref(false)
const showLangDropdown = ref(false)
const showMobileMenu = ref(false)
const mobileDropdown = ref('')

const btnLabel = computed(() => globalStore.isAuthenticated ? 'user.dashboard' : 'user.login')
const appLogo = config.general.logo
const externalLink = config.general.externalLink
const hasCMS = config.general.cms
const hasGoat = config.general.goat
const generatedLink = computed(() => appLogo && appLogo.includes('http') ?
  appLogo :
  new URL(`/src/assets/${appLogo}`, import.meta.url).href
)

const dashboardDefaultTitle = "BioGenome Portal"

const title = computed<LangOption | string>(() => config.general.title[locale.value] as LangOption ?? dashboardDefaultTitle)
const isMobile = computed(() => breakpoint.mdDown || breakpoint.sm || breakpoint.xs)
const languages = computed(() => config.general.languages as { code: string, name: string }[])

const models = computed(() =>
  Object.keys(config.models)
    .filter(k => !generalConfigs.includes(k))
    .map((k) => {
      return { text: k, value: k }
    }
    ))

function handleLang(lang: { code: string, name: string }) {
  locale.value = lang.code
  globalStore.changeLang(lang.code)
  showLangDropdown.value = false
}


async function downloadGoatReport() {
  try {
    const response = await GoaTService.getGoatReport()
    const data = response.data
    const href = URL.createObjectURL(data);
    let name = 'goat_report.tsv'
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  } catch (err) {
    console.error(err)
    init({ message: 'Error downloading Goat Report', color: 'danger' })
  }
}

function updateDropdownPosition(event: MouseEvent, dropdown: HTMLElement) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const dropdownWidth = dropdown.offsetWidth
  const dropdownHeight = dropdown.offsetHeight

  // Calculate initial position
  let left = rect.left
  let top = rect.bottom + 8

  // Adjust if dropdown would overflow right edge
  if (left + dropdownWidth > viewportWidth) {
    left = viewportWidth - dropdownWidth - 16
  }

  // Adjust if dropdown would overflow bottom edge
  if (top + dropdownHeight > viewportHeight) {
    top = rect.top - dropdownHeight - 8
  }

  // Ensure dropdown doesn't go off the left edge
  left = Math.max(16, left)

  // Apply the position
  dropdown.style.left = `${left}px`
  dropdown.style.top = `${top}px`
}

// Add event listeners for dropdown positioning
onMounted(() => {
  const dropdowns = document.querySelectorAll('.nav-dropdown')
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('mouseenter', (e) => {
      const content = dropdown.querySelector('.dropdown-content') as HTMLElement
      if (content) {
        updateDropdownPosition(e as MouseEvent, content)
      }
    })
  })
})

onUnmounted(() => {
  const dropdowns = document.querySelectorAll('.nav-dropdown')
  dropdowns.forEach(dropdown => {
    dropdown.removeEventListener('mouseenter', () => { })
  })
})
</script>

<style lang="scss" scoped>
.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--va-background-secondary);
  }

  i {
    font-size: 1rem;
  }
}

.nav-dropdown {
  position: relative;
  cursor: pointer;
}

.dropdown-content {
  position: fixed;
  min-width: 200px;
  padding: 0.5rem;
  background: var(--va-background-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 0.5rem;

  &::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 8px;
  }
}

.dropdown-item {
  padding: 0.75rem 1rem;
  color: var(--va-text-primary);
  text-decoration: none;
  display: block;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: var(--va-background-secondary);
    transform: translateX(4px);
  }

  &:active {
    background-color: var(--va-background-tertiary);
  }
}

.image-wrapper {
  width: 10rem;
  padding: 0;
}

.image-h {
  height: 3.5rem;
  width: 100%;
}

@media (max-width: 576px) {
  .image-wrapper {
    width: 8rem;
  }

  .image-h {
    height: 4rem;
  }

  .nav-links {
    gap: 1rem;
  }
}

@media (min-width: 577px) and (max-width: 768px) {
  .image-wrapper {
    width: 9rem;
  }

  .image-h {
    height: 4.5rem;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .image-wrapper {
    width: 10rem;
  }

  .image-h {
    height: 5rem;
  }
}
</style>