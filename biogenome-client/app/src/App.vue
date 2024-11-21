<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top Bar -->
    <NavBar :imgUrl="imgUrl" />
    <main class="flex-1 p-4">
      <router-view v-slot="{ Component }">
        <Transition name="fade">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
    <Toast />

  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import config from '../configs/general.json'
import NavBar from './components/NavBar.vue';

const { nav, tracker, title } = config

const imgUrl = new URL(`/src/assets/${nav.logo}`, import.meta.url).href

onMounted(async () => {
  document.title = title
  if (tracker) {
    setConfigTracker()
  }
})

function setConfigTracker() {
  const src = import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH + `/tracking/${config.tracker}` : `/tracking/${config.tracker}`
  const trackerScript = document.createElement('script')
  trackerScript.setAttribute("type", "text/javascript")
  trackerScript.setAttribute("src", src)
  document.head.appendChild(trackerScript)
}

</script>

<style lang="scss">
.row-equal {
  .flex {
    .va-card {
      height: 100%;
    }
  }
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.5s ease;
}
</style>
