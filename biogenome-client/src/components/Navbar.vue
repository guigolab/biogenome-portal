<template>
  <VaNavbar shadowed bordered>
    <template #left>
      <VaNavbarItem class="image-wrapper">
        <VaImage fit="contain" class="image-h" lazy :src="generatedLink">
        </VaImage>
      </VaNavbarItem>
    </template>
    <template #right>
      <VaNavbarItem>
        <VaButton :to="{ name: 'home' }" preset="secondary" icon="fa-house" color="textPrimary">{{ !hideIcon ?
          t('nav.home') : ''
          }}
        </VaButton>
        <VaMenu :options="models" :text-by="(item: any) => t(`models.${item.text}`)"
          @selected="(obj) => router.push({ name: 'model', params: { model: obj.value } })">
          <template #anchor>
            <VaButton preset="secondary" icon="fa-database" color="textPrimary">{{ !hideIcon ? t('nav.data') : ''
              }}
            </VaButton>
          </template>
        </VaMenu>
        <VaMenu>
          <template #anchor>
            <VaButton icon="fa-wrench" preset="secondary" color="textPrimary">{{ !hideIcon ? t('nav.tools') : ''
              }}
            </VaButton>
          </template>
          <VaMenuItem>
            <RouterLink :style="{ 'color': colors.textPrimary }" :to="{ name: 'tree' }">
              {{ t('nav.taxExplorer') }}
            </RouterLink>
          </VaMenuItem>
          <VaMenuItem v-if="config.models.assemblies">
            <RouterLink :style="{ 'color': colors.textPrimary }" :to="{ name: 'jbrowse' }">
              {{ t('nav.genomeBrowser') }}
            </RouterLink>
          </VaMenuItem>
          <VaMenuItem v-if="hasGoat" @selected="downloadGoatReport"> {{ t('buttons.goat') }}</VaMenuItem>
        </VaMenu>
        <VaMenu :options="settings">
          <template #anchor>
            <VaButton preset="secondary" icon="fa-cog" color="textPrimary">{{ !hideIcon ? t('nav.settings') : ''
              }}
            </VaButton>
          </template>
          <VaMenuItem v-if="config.general.cms">
            <RouterLink :style="{ 'color': colors.textPrimary }" :to="{ name: 'admin' }">
              Admin
            </RouterLink>
          </VaMenuItem>
          <VaMenuItem>
            <a :style="{ 'color': colors.textPrimary }" href="https://github.com/guigolab/biogenome-portal"
              target="_blank">
              GitHub
            </a>
          </VaMenuItem>
          <VaMenuItem>
            <a :style="{ 'color': colors.textPrimary }" href="https://guigolab.github.io/biogenome-portal/"
              target="_blank">
              API Docs
            </a>
          </VaMenuItem>
        </VaMenu>
        <VaMenu>
          <template #anchor>
            <VaButton color="textPrimary">{{ locale }}
            </VaButton>
          </template>
          <VaMenuItem @selected="handleLang(lang)" v-for="lang in languages" :key="lang.code">{{
            t(`language.${lang.name}`) }}
          </VaMenuItem>
        </VaMenu>
      </VaNavbarItem>
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
// import LanguageDropdown from './LanguageDropdown.vue'
import { AppConfig } from '../data/types';
import { RouterLink, useRouter } from 'vue-router';
import { useBreakpoint, useColors, useToast } from 'vuestic-ui';
import { useI18n } from 'vue-i18n';
import GoaTService from '../services/GoaTService';


const { colors } = useColors()
const { t, locale } = useI18n()
const breakpoint = useBreakpoint()
const config = inject('appConfig') as AppConfig
const router = useRouter()
const generalConfigs = ['general', 'ui']

const { init } = useToast()

const appLogo = config.general.logo
const hasGoat = config.general.goat
const generatedLink = computed(() => appLogo && appLogo.includes('http') ?
  appLogo :
  new URL(`/src/assets/${appLogo}`, import.meta.url).href
)

const hideIcon = computed(() => breakpoint.sm || breakpoint.xs)
const languages = computed(() => config.general.languages as { code: string, name: string }[])

const models = computed(() =>
  Object.keys(config.models)
    .filter(k => !generalConfigs.includes(k))
    .map((k) => {
      return { text: k, value: k }
    }
    ))

const settings = ['Login', 'GitHub', 'API Docs']
//retrieve configured models 

function handleLang(lang: { code: string, name: string }) {
  locale.value = lang.code
}

async function downloadGoatReport() {
  try {
    const response = await GoaTService.getGoatReport()
    const data = response.data
    const href = URL.createObjectURL(data);
    let name = 'goat_report.tsv'
    // create "a" HTML element with href to file & click
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', name); //or any other extension
    document.body.appendChild(link);
    link.click();
    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  } catch (err) {
    console.error(err)
    init({ message: 'Error downloading Goat Report', color: 'danger' })
  }
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
  height: 3.5rem;
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