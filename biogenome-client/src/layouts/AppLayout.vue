<template>
  <div class="app-layout">
    <navbar />
    <div class="app-layout__content">
      <div class="app-layout__sidebar-wrapper" :class="{ minimized: isSidebarMinimized }">
        <sidebar :width="sidebarWidth" :minimized="isSidebarMinimized" :minimized-width="sidebarMinimizedWidth"
          :animated="!isMobile" />
      </div>
      <div class="app-layout__page">
        <div id="scroll-container" class="layout fluid va-gutter-5">
          <va-breadcrumbs class="va-title" color="primary">
            <!-- <va-breadcrumbs-item :to="{ name: 'biosamples' }" :label="t('biosampleList.breadcrumb')" /> -->
            <va-breadcrumbs-item :to="bc.to" v-for="bc in breadcrumbs" :label="bc.label" />
          </va-breadcrumbs>
          <va-divider />
          <router-view v-slot="{ Component }">
            <Transition name="fade">
              <component :is="Component" />
            </Transition>
          </router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteUpdate } from 'vue-router'
import { useGlobalStore } from '../stores/global-store'
import Navbar from '../components/navbar/Navbar.vue'
import Sidebar from '../components/sidebar/Sidebar.vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()

const { t } = useI18n()

const GlobalStore = useGlobalStore()

const mobileBreakPointPX = 410
const tabletBreakPointPX = 810

const sidebarWidth = ref('100wv')
const sidebarMinimizedWidth = ref(undefined)

const isMobile = ref(false)
const isTablet = ref(false)
const { isSidebarMinimized } = storeToRefs(GlobalStore)
const checkIsTablet = () => window.innerWidth <= tabletBreakPointPX
const checkIsMobile = () => window.innerWidth <= mobileBreakPointPX

const onResize = () => {
  isSidebarMinimized.value = checkIsTablet()

  isMobile.value = checkIsMobile()
  isTablet.value = checkIsTablet()
  sidebarMinimizedWidth.value = isMobile.value ? '0' : '4.5rem'
  sidebarWidth.value = isTablet.value ? '100%' : '16rem'
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

const breadcrumbs = computed(() => {
  const splittedRoute = router.currentRoute.value.path.split('/').filter(p => p)
  if (splittedRoute.length > 1 && router.currentRoute.value.name !== 'taxon') {
    return [
      {
        label: router.currentRoute.value.meta.name,
        to: { name: router.currentRoute.value.meta.name }
      },
      {
        label: splittedRoute[1],
      }
    ]

  } else if (router.currentRoute.value.name === "taxon") {
    return [{
      label: "taxonomy",
      to: { name: "taxonomy" }
    },
    {
      label: splittedRoute[1],
      to: { name: 'taxon', params: { taxid: splittedRoute[1] } }
    }]
  } else {
    return [{
      label: router.currentRoute.value.name,
      to: { name: router.currentRoute.value.name }
    }]
  }
})

onBeforeRouteUpdate(() => {
  if (checkIsTablet()) {
    // Collapse sidebar after route change for Mobile
    isSidebarMinimized.value = true
  }
})

onResize()


</script>

<style lang="scss">
$mobileBreakPointPX: 450px;
$tabletBreakPointPX: 810px;

.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;

  &__navbar {
    min-height: 4rem;
  }

  &__content {
    display: flex;
    height: calc(100vh - 4rem);
    flex: 1;

    @media screen and (max-width: $tabletBreakPointPX) {
      height: calc(100vh - 6.5rem);
    }

    .app-layout__sidebar-wrapper {
      position: relative;
      height: 100%;
      background: var(--va-white);

      @media screen and (max-width: $tabletBreakPointPX) {
        &:not(.minimized) {
          width: 100%;
          height: 100%;
          position: fixed;
          top: 0;
          z-index: 999;
        }

        .va-sidebar:not(.va-sidebar--minimized) {
          // Z-index fix for preventing overflow for close button
          z-index: -1;

          .va-sidebar__menu {
            padding: 0;
          }
        }
      }
    }
  }

  &__page {
    flex-grow: 2;
    overflow-y: scroll;
  }
}

.chart {
  height: 400px;
}

.row-equal .flex {
  .va-card {
    height: 100%;
  }
}
</style>
