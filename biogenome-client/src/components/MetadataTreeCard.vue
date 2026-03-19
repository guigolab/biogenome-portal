<template>
   <div class="meta-card">
      <!-- Toolbar: search + actions -->
      <div class="meta-card__toolbar">
         <div class="meta-card__search">
            <VaIcon name="fa-magnifying-glass" size="small" class="meta-card__search-icon" />
            <input
               v-model="filter"
               class="meta-card__search-input"
               placeholder="Search fields…"
               autocomplete="off"
               spellcheck="false"
            />
            <button v-if="filter" class="meta-card__search-clear" @click="filter = ''" aria-label="Clear">
               <VaIcon name="close" size="12px" />
            </button>
         </div>
         <div class="meta-card__actions">
            <button class="meta-card__action-btn" @click="copyToClipboard" title="Copy JSON">
               <VaIcon name="fa-copy" size="small" />
            </button>
            <button class="meta-card__action-btn" @click="downloadJsonFile" title="Download JSON">
               <VaIcon name="fa-file-arrow-down" size="small" />
            </button>
         </div>
      </div>

      <!-- Nested metadata view -->
      <div class="meta-card__body">
         <template v-if="filteredNodes.length">
            <MetaNode
               v-for="node in filteredNodes"
               :key="node.id"
               :node="node"
               :default-expanded="true"
               :filter="filter"
            />
         </template>
         <p v-else class="meta-card__empty">{{ emptyMessage }}</p>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed, ref } from 'vue'
   import type { TreeNode } from 'vuestic-ui/web-components'
   import { useToast } from 'vuestic-ui/web-components'
   import MetaNode from './MetaNode.vue'

   const { init } = useToast()

   type ObjectEntry = [string, any]

   const props = defineProps<{
      metadata: ObjectEntry[]
      id: string
   }>()

   const filter = ref('')

   const formattedJson = computed(() => JSON.stringify(Object.fromEntries(props.metadata), null, 2))

   async function copyToClipboard() {
      try {
         await navigator.clipboard.writeText(formattedJson.value)
         init({ message: 'JSON copied to clipboard!' })
      } catch (err) {
         init({ message: 'Failed to copy: ' + err, color: 'danger' })
      }
   }

   function downloadJsonFile() {
      const blob = new Blob([formattedJson.value], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${props.id}.json`
      link.click()
      URL.revokeObjectURL(url)
   }

   function nodeMatches(node: TreeNode, text: string): boolean {
      if (!text) return true
      const t = text.toLowerCase()
      const labelMatch = !!node.label && String(node.label).toLowerCase().includes(t)
      const descMatch =
         node.description !== undefined &&
         node.description !== null &&
         typeof node.description === 'string' &&
         String(node.description).toLowerCase().includes(t)
      if (labelMatch || descMatch) return true
      if (Array.isArray(node.children)) {
         return node.children.some((child) => nodeMatches(child, text))
      }
      return false
   }

   function filterTree(nodes: TreeNode[], text: string): TreeNode[] {
      if (!text) return nodes
      return nodes.filter((node) => nodeMatches(node, text))
   }

   const currentNodes = computed(() => {
      if (!props.metadata.length) return []
      const tree = buildTree(props.metadata, undefined)
      return tree.length ? tree : [{ id: 'noMetadata', label: 'No metadata available', description: '' }]
   })

   const filteredNodes = computed(() => filterTree(currentNodes.value, filter.value))

   const emptyMessage = computed(() =>
      filter.value ? 'No fields match your search.' : 'No metadata available.',
   )

   function buildTree(data: ObjectEntry[], parentKey: string | undefined): TreeNode[] {
      const treeNodes: TreeNode[] = []
      for (const [key, value] of data) {
         const id = parentKey ? `${parentKey}__${key}` : key
         if (value === null || value === undefined || value === '') continue

         if (Array.isArray(value)) {
            const childNodes = value.flatMap((item: any, idx: number) => {
               if (item === null || item === undefined) return []
               if (typeof item === 'object') {
                  return buildTree(Object.entries(item), `${id}[${idx}]`)
               }
               return [{ id: `${id}[${idx}]`, label: '', description: String(item) }]
            })
            treeNodes.push({ id, label: key, children: childNodes })
         } else if (typeof value === 'object') {
            const childNodes = buildTree(Object.entries(value), id)
            treeNodes.push({ id, label: key, children: childNodes })
         } else if (typeof value === 'string' && value.includes(';') && value.split(';').length > 1) {
            const childNodes = value.split(';').map((v: string, i: number) => ({
               id: `${id}_${i}`,
               label: '',
               description: v.trim(),
            }))
            treeNodes.push({ id, label: key, children: childNodes })
         } else {
            treeNodes.push({ id, label: key, description: String(value) })
         }
      }
      return treeNodes
   }
</script>

<style lang="scss" scoped>
   .meta-card {
      display: flex;
      flex-direction: column;
      gap: 0;
      --meta-font-body: 0.9375rem;
      --meta-font-secondary: 0.875rem;
      --meta-font-meta: 0.8125rem;
      --meta-font-kicker: 0.75rem;
   }

   .meta-card__toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.625rem;
   }

   .meta-card__search {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      height: 2rem;
      padding: 0 0.625rem;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:focus-within {
         border-color: var(--va-primary);
         box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.1);
      }
   }

   .meta-card__search-icon {
      flex-shrink: 0;
      color: var(--va-text-secondary);
      opacity: 0.6;
   }

   .meta-card__search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: var(--meta-font-secondary);
      color: var(--va-text-primary);
      line-height: 1.45;

      &::placeholder {
         color: var(--va-text-secondary);
         opacity: 0.6;
      }
   }

   .meta-card__search-clear {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      background: transparent;
      color: var(--va-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      padding: 0;
      opacity: 0.6;
      transition: opacity 0.15s ease;

      &:hover {
         opacity: 1;
      }
   }

   .meta-card__actions {
      display: flex;
      gap: 0.375rem;
      flex-shrink: 0;
   }

   .meta-card__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      background: var(--va-background-primary);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

      &:hover {
         background: var(--va-background-element);
         border-color: var(--va-primary);
         color: var(--va-primary);
      }
   }

   .meta-card__body {
      max-height: 20rem;
      overflow-y: auto;
      padding: 0.25rem 0;
   }

   .meta-card__empty {
      font-size: var(--meta-font-secondary);
      color: var(--va-text-secondary);
      margin: 0.5rem 0 0;
      padding: 0.5rem;
   }
</style>
