<template>
  <VaNavbarItem class="nav-hamburger">
    <VaDropdown v-model="showMobileMenu" :close-on-content-click="false" placement="bottom-start">
      <template #anchor>
        <VaButton icon="fa-bars" :color="textColor" preset="secondary" size="large" />
      </template>
      <div class="mobile-menu-content">
        <VaButton preset="secondary" class="dropdown-item" @click="goHome">
           {{ t('nav.home') }}
        </VaButton>
        <VaButton preset="secondary" class="dropdown-item" @click="toggleMobileDropdown('data')">
           {{ t('nav.data') }}
        </VaButton>
        <div v-show="mobileDropdown === 'data'" class="mobile-submenu">
          <VaButton v-for="model in models" :key="model.value" preset="secondary" class="dropdown-item"
            @click="goModel(model.value)">
            {{ t(`models.${model.text}`) }}
          </VaButton>
        </div>
        <VaButton preset="secondary" class="dropdown-item" @click="toggleMobileDropdown('tools')">
          {{ t('nav.tools') }}
        </VaButton>
        <div v-show="mobileDropdown === 'tools'" class="mobile-submenu">
          <VaButton preset="secondary" class="dropdown-item" @click="goRoute('tree')">
            {{ t('nav.taxExplorer') }}
          </VaButton>
          <VaButton preset="secondary" class="dropdown-item" @click="goRoute('map')">
            {{ t('map.title') }}
          </VaButton>
          <VaButton v-if="config.models.assemblies" preset="secondary" class="dropdown-item" @click="goRoute('jbrowse')">
            {{ t('nav.genomeBrowser') }}
          </VaButton>
          <VaButton v-if="hasGoat" preset="secondary" class="dropdown-item" @click="downloadGoatReport">
            {{ t('buttons.goat') }}
          </VaButton>
        </div>
        <VaButton preset="secondary" class="dropdown-item" @click="toggleMobileDropdown('settings')">
         {{ t('nav.settings') }}
        </VaButton>
        <div v-show="mobileDropdown === 'settings'" class="mobile-submenu">
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
        <VaButton v-if="hasCMS" preset="secondary" class="dropdown-item" @click="goRoute('admin')">
          {{ btnLabel }}
        </VaButton>
        <VaButton preset="secondary" class="dropdown-item" @click="toggleMobileDropdown('lang')">
          {{ locale }}
        </VaButton>
        <div v-show="mobileDropdown === 'lang'" class="mobile-submenu">
          <VaButton v-for="lang in languages" :key="lang.code" preset="secondary" class="dropdown-item"
            @click="handleLang(lang)">
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

interface Model {
  value: string
  text: string
}
interface Language {
  code: string
  name: string
}

const props = defineProps<{
  mobileDropdown: string,
  models: Model[],
  languages: Language[],
  config: Record<string, any>,
  hasGoat: Boolean,
  externalLink: string,
  hasCMS: Boolean,
  locale: string,
  btnLabel: string,
  textColor: string,
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
.nav-hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-menu-content {
  min-width: 220px;
  padding: 1rem 0.5rem;
  background: var(--va-background-primary);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-submenu {
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
</style> 