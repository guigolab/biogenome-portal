<template>
   <Teleport to="body">
      <Transition name="cms-drawer-fade">
         <div
            v-if="drawer.isOpen"
            class="cms-drawer-root admin-layout-root"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
         >
            <div class="cms-drawer-backdrop" aria-hidden="true" @click="drawer.close()" />
            <aside class="cms-drawer-panel" @click.stop>
               <header class="cms-drawer-panel__header">
                  <h2 :id="titleId" class="cms-drawer-panel__title">{{ drawerTitle }}</h2>
                  <button
                     type="button"
                     class="cms-drawer-panel__close"
                     aria-label="Close"
                     @click="drawer.close()"
                  >
                     <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                     </svg>
                  </button>
               </header>
               <div class="cms-drawer-panel__body">
                  <INSDCForm
                     v-if="drawer.panel === 'insdc'"
                     :key="`insdc-${drawer.insdcImportModel ?? ''}`"
                     embedded
                     :import-model="drawer.insdcImportModel"
                  />
                  <GoaTUpload
                     v-else-if="drawer.panel === 'goat'"
                     key="goat"
                     embedded
                  />
                  <SpreadsheetUpload
                     v-else-if="drawer.panel === 'spreadsheet'"
                     key="spreadsheet"
                     embedded
                  />
                  <UserForm
                     v-else-if="drawer.panel === 'user'"
                     :key="`user-${drawer.userName ?? 'new'}`"
                     embedded
                     :name="drawer.userName"
                  />
                  <AnnotationForm
                     v-else-if="drawer.panel === 'annotation'"
                     :key="`annotation-${drawer.annotationName ?? 'new'}`"
                     embedded
                     :name="drawer.annotationName"
                  />
               </div>
            </aside>
         </div>
      </Transition>
   </Teleport>
</template>

<script setup lang="ts">
   import { computed, onMounted, onUnmounted } from 'vue'
   import { useCmsDashboardDrawerStore } from '../../../stores/cms-dashboard-drawer-store'
   import INSDCForm from '../forms/INSDCForm.vue'
   import GoaTUpload from '../forms/GoaTUpload.vue'
   import SpreadsheetUpload from '../forms/SpreadsheetUpload.vue'
   import UserForm from '../forms/UserForm.vue'
   import AnnotationForm from '../forms/AnnotationForm.vue'

   const drawer = useCmsDashboardDrawerStore()
   const titleId = 'cms-dashboard-drawer-title'

   const titleByPanel: Record<string, string> = {
      insdc: 'Import from INSDC',
      goat: 'GoaT report upload',
      spreadsheet: 'Sample metadata import',
      user: 'User',
      annotation: 'Annotation',
   }

   const drawerTitle = computed(() => {
      const p = drawer.panel
      if (!p) return ''
      if (p === 'user' && drawer.userName) return `Edit ${drawer.userName}`
      if (p === 'user') return 'Create user'
      if (p === 'annotation' && drawer.annotationName) return `Edit ${drawer.annotationName}`
      if (p === 'annotation') return 'Create annotation'
      return titleByPanel[p] ?? ''
   })

   function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && drawer.isOpen) drawer.close()
   }

   onMounted(() => document.addEventListener('keydown', onKeydown))
   onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style lang="scss" scoped>
   .cms-drawer-root {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: flex;
      justify-content: flex-end;
      align-items: stretch;
   }

   .cms-drawer-backdrop {
      position: absolute;
      inset: 0;
      z-index: 0;
      background: rgba(15, 23, 42, 0.45);
   }

   .cms-drawer-panel {
      position: relative;
      z-index: 1;
      flex: 0 0 min(720px, 92vw);
      width: min(720px, 92vw);
      max-width: 100%;
      height: 100%;
      background: var(--cms-bg-page);
      box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
      font-family: var(--cms-font);
   }

   .cms-drawer-panel__header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid var(--cms-border);
      background: var(--cms-bg-surface);
   }

   .cms-drawer-panel__title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 650;
      letter-spacing: -0.02em;
      color: var(--cms-text);
      line-height: 1.3;
   }

   .cms-drawer-panel__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border: none;
      border-radius: var(--cms-radius-sm);
      background: transparent;
      color: var(--cms-text-muted);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.12s, color 0.12s;

      &:hover {
         background: var(--cms-bg-muted);
         color: var(--cms-text);
      }
   }

   .cms-drawer-panel__body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
   }

   .cms-drawer-fade-enter-active,
   .cms-drawer-fade-leave-active {
      transition: opacity 0.2s ease;
   }

   .cms-drawer-fade-enter-active .cms-drawer-panel,
   .cms-drawer-fade-leave-active .cms-drawer-panel {
      transition: transform 0.22s ease;
   }

   .cms-drawer-fade-enter-from,
   .cms-drawer-fade-leave-to {
      opacity: 0;
   }

   .cms-drawer-fade-enter-from .cms-drawer-panel,
   .cms-drawer-fade-leave-to .cms-drawer-panel {
      transform: translateX(100%);
   }
</style>
