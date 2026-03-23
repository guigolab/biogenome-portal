<template>
   <div class="assembly-input">
      <label class="assembly-input__label" for="assembly-input-field">
         Assembly <span class="assembly-input__required">*</span>
      </label>
      <div class="assembly-input__wrap" :class="{ 'assembly-input__wrap--focused': focused }">
         <svg class="assembly-input__search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>
         <input
            id="assembly-input-field"
            class="assembly-input__field"
            :placeholder="selected ? selected : 'Search assemblies…'"
            autocomplete="off"
            :value="searchText"
            @input="handleInput"
            @focus="onFocus"
            @blur="onBlur"
            @keydown.enter.prevent="selectFirst"
            @keydown.escape="closeDropdown"
         />
         <span v-if="loading" class="assembly-input__spinner" aria-hidden="true" />
         <button
            v-if="selected"
            type="button"
            class="assembly-input__clear"
            aria-label="Clear selection"
            @click.stop="clearSelection"
         >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
               <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
         </button>
      </div>

      <!-- Dropdown -->
      <div v-if="open && assemblies.length" class="assembly-input__dropdown" role="listbox">
         <button
            v-for="item in assemblies"
            :key="item.accession || item.assembly_accession"
            type="button"
            role="option"
            class="assembly-input__dropdown-item"
            @mousedown.prevent="selectItem(item)"
         >
            <span class="assembly-input__dropdown-accession">{{ item.accession || item.assembly_accession }}</span>
            <span v-if="item.scientific_name" class="assembly-input__dropdown-name">{{ item.scientific_name }}</span>
         </button>
      </div>

      <p v-if="selected" class="assembly-input__hint">
         Selected: <strong>{{ selected }}</strong>
      </p>
   </div>
</template>

<script setup lang="ts">
   import { ref } from 'vue'
   import { useAnnotationStore } from '../../../stores/annotation-store'
   import CommonService from '../../../services/CommonService'

   const annotationStore = useAnnotationStore()
   const assemblies = ref<Record<string, any>[]>([])
   const searchText = ref('')
   const selected = ref('')
   const focused = ref(false)
   const open = ref(false)
   const loading = ref(false)
   let debounceTimer: ReturnType<typeof setTimeout> | null = null

   function onFocus() {
      focused.value = true
      if (assemblies.value.length) open.value = true
   }

   function onBlur() {
      focused.value = false
      setTimeout(() => { open.value = false }, 150)
   }

   function closeDropdown() { open.value = false }

   function clearSelection() {
      selected.value = ''
      annotationStore.annotationForm.assembly_accession = ''
      searchText.value = ''
      assemblies.value = []
   }

   function selectFirst() {
      if (assemblies.value.length) selectItem(assemblies.value[0])
   }

   function selectItem(item: Record<string, any>) {
      const accession = item.accession || item.assembly_accession
      selected.value = `${accession}${item.scientific_name ? ` (${item.scientific_name})` : ''}`
      annotationStore.annotationForm.assembly_accession = accession
      open.value = false
      searchText.value = ''
   }

   function handleInput(event: Event) {
      const q = (event.target as HTMLInputElement).value
      searchText.value = q
      if (debounceTimer) clearTimeout(debounceTimer)
      if (!q.trim()) { assemblies.value = []; open.value = false; return }
      debounceTimer = setTimeout(() => void search(q), 300)
   }

   async function search(q: string) {
      loading.value = true
      try {
         const { data } = await CommonService.getItems('assemblies', { filter: q })
         assemblies.value = Array.isArray(data.data) ? data.data : []
         open.value = assemblies.value.length > 0
      } finally {
         loading.value = false
      }
   }
</script>

<style lang="scss" scoped>
   .assembly-input {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      position: relative;
      font-family: var(--cms-font);
   }

   .assembly-input__label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text);
      cursor: default;
   }

   .assembly-input__required { color: var(--cms-danger); }

   .assembly-input__wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--cms-bg-surface);
      border: 1.5px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      transition: border-color 0.15s, box-shadow 0.15s;
      min-height: 2.375rem;

      &--focused {
         border-color: var(--cms-primary);
         box-shadow: var(--cms-focus-ring);
      }
   }

   .assembly-input__search-icon {
      flex-shrink: 0;
      margin-left: 0.75rem;
      color: var(--cms-text-faint);
      pointer-events: none;
   }

   .assembly-input__field {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      padding: 0.5rem 0.75rem;
      font-size: 0.9375rem;
      font-family: var(--cms-font);
      color: var(--cms-text);
      &::placeholder { color: var(--cms-text-faint); }
   }

   @keyframes asm-spin { to { transform: rotate(360deg); } }

   .assembly-input__spinner {
      flex-shrink: 0;
      width: 13px;
      height: 13px;
      margin-right: 0.625rem;
      border: 2px solid var(--cms-border-strong);
      border-top-color: var(--cms-primary);
      border-radius: 50%;
      animation: asm-spin 0.7s linear infinite;
   }

   .assembly-input__clear {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      margin-right: 0.25rem;
      border: none;
      background: transparent;
      color: var(--cms-text-faint);
      border-radius: 4px;
      cursor: pointer;
      transition: color 0.12s, background 0.12s;
      &:hover { color: var(--cms-text); background: var(--cms-border); }
   }

   .assembly-input__dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 20;
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border-strong);
      border-radius: 8px;
      box-shadow: var(--cms-shadow-md);
      max-height: 260px;
      overflow-y: auto;
   }

   .assembly-input__dropdown-item {
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      cursor: pointer;
      transition: background 0.1s;
      &:hover { background: var(--cms-bg-hover); }
   }

   .assembly-input__dropdown-accession {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cms-text);
      font-family: var(--cms-font-mono);
   }

   .assembly-input__dropdown-name {
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   .assembly-input__hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--cms-text-muted);
   }
</style>
