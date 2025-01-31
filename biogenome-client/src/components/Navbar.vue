<template>
  <VaNavbar shadowed bordered>
    <template #left>
      <VaNavbarItem class="image-wrapper">
        <VaImage fit="contain" class="image-h" lazy :src="imgUrl">
        </VaImage>
      </VaNavbarItem>
    </template>
    <template #right>
      <VaNavbarItem>
        <VaMenu :options="models" :text-by="(item: any) => t(`models.${item.text}`)"
          @selected="(obj) => router.push({ name: 'model', params: { model: obj.value } })">
          <template #anchor>
            <VaButton preset="secondary" icon="fa-database" color="textPrimary">{{ breakpoint.smUp ? t('nav.data') : ''
              }}
            </VaButton>
          </template>
        </VaMenu>
        <VaMenu>
          <template #anchor>
            <VaButton icon="fa-wrench" preset="secondary" color="textPrimary">{{ breakpoint.smUp ? t('nav.tools') : ''
              }}
            </VaButton>
          </template>
          <VaMenuItem @selected="router.push({ name: 'tree' })">
            {{ t('nav.taxExplorer') }}
          </VaMenuItem>
          <VaMenuItem @selected="router.push({ name: 'tree' })">
            {{ t('nav.genomeBrowser') }}
          </VaMenuItem>
        </VaMenu>
        <VaMenu :options="settings">
          <template #anchor>
            <VaButton preset="secondary" icon="fa-cog" color="textPrimary">{{ breakpoint.smUp ? t('nav.settings') : '' }}
            </VaButton>
          </template>
        </VaMenu>
        <VaMenu>
          <template #anchor>
            <VaButton color="textPrimary">{{ locale }}
            </VaButton>
          </template>
          <VaMenuItem @selected="handleLang(lang)" v-for="lang in languages"  :key="lang.code">{{ t(`language.${lang.name}`)}}
          </VaMenuItem>
        </VaMenu>
      </VaNavbarItem>


    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
// import LanguageDropdown from './LanguageDropdown.vue'
import { iconMap } from '../composable/useIconMap';
import { DataModels, AppConfig } from '../data/types';
import { useRouter } from 'vue-router';
import { useBreakpoint } from 'vuestic-ui';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n()
const breakpoint = useBreakpoint()

const config = inject('appConfig') as AppConfig
const router = useRouter()
const generalConfigs = ['general', 'dashboard', 'ui']


const appLogo = config.general.logo

const languages = computed(() => config.general.languages as { code: string, name: string }[])
const imgUrl = new URL(`/src/assets/${appLogo}`, import.meta.url).href

const models = computed(() =>
  Object.keys(config.models)
    .filter(k => !generalConfigs.includes(k))
    .map((k) => {
      return { icon: iconMap[k as DataModels].icon, text: k, value: k }
    }
    ))

const features = ['Taxonomy Explorer', 'Genome Browser', '3D Map']

const settings = ['Login', 'Languages', 'GitHub', 'API Docs']
//retrieve configured models 

function handleLang(lang: { code: string, name: string }) {
  locale.value = lang.code
}

</script>
<style>
.nav-p {
  padding-bottom: 10px !important;
  padding-top: 10px !important;
}

/* Default styles (base) */
.image-wrapper {
  width: 10rem;
  padding: 0;
}

.image-h {
  height: 5rem;
  width: 100%;
}

/* Small screens (e.g., smartphones) */
@media (max-width: 576px) {
  .image-wrapper {
    width: 8rem;
    /* Adjust width */
  }

  .image-h {
    height: 4rem;
    /* Adjust height */
  }
}

/* Medium screens (e.g., tablets) */
@media (min-width: 577px) and (max-width: 768px) {
  .image-wrapper {
    width: 9rem;
    /* Slightly larger for tablets */
  }

  .image-h {
    height: 4.5rem;
    /* Adjust height */
  }
}

/* Large screens (e.g., desktops) */
@media (min-width: 769px) and (max-width: 1200px) {
  .image-wrapper {
    width: 10rem;
    /* Keep the default width for large screens */
  }

  .image-h {
    height: 5rem;
    /* Keep the default height */
  }
}
</style>