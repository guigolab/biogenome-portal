<template>
   <template v-if="hasChildren">
      <div class="meta-node meta-node--group">
         <button
            type="button"
            class="meta-node__trigger"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
         >
            <VaIcon
               :name="expanded ? 'fa-chevron-down' : 'fa-chevron-right'"
               size="10px"
               class="meta-node__chevron"
            />
            <span class="meta-node__label">{{ node.label }}</span>
         </button>
         <Transition name="meta-expand">
            <div v-show="expanded" class="meta-node__children">
               <MetaNode
                  v-for="child in node.children"
                  :key="child.id"
                  :node="child"
                  :default-expanded="defaultExpanded || !!filter"
                  :filter="filter"
               />
            </div>
         </Transition>
      </div>
   </template>
   <div v-else class="meta-node meta-node--row">
      <span v-if="node.label" class="meta-node__key">{{ node.label }}</span>
      <template v-if="node.description !== undefined && node.description !== null && node.description !== ''">
         <span v-if="node.label" class="meta-node__sep">·</span>
         <a
            v-if="isUrl(node.description)"
            :href="String(node.description)"
            target="_blank"
            rel="noopener noreferrer"
            class="meta-node__value meta-node__value--link"
         >
            {{ node.description }}
         </a>
         <span v-else class="meta-node__value">{{ node.description }}</span>
      </template>
   </div>
</template>

<script setup lang="ts">
   import { ref, computed, watch } from 'vue'
   import type { TreeNode } from 'vuestic-ui/web-components'

   const props = withDefaults(
      defineProps<{
         node: TreeNode
         defaultExpanded?: boolean
         filter?: string
      }>(),
      { defaultExpanded: undefined, filter: '' },
   )

   const expanded = ref(props.defaultExpanded ?? !!props.filter)

   watch(
      () => [props.defaultExpanded, props.filter],
      ([def, f]) => {
         if (def !== undefined) expanded.value = def
         else if (f) expanded.value = true
      },
   )

   const defaultExpanded = computed(() => props.defaultExpanded ?? false)
   const filter = computed(() => props.filter ?? '')

   const hasChildren = computed(
      () => Array.isArray(props.node.children) && props.node.children.length > 0,
   )

   function isUrl(val: unknown): boolean {
      return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))
   }
</script>

<style lang="scss" scoped>
   .meta-node {
      --meta-indent: 0.875rem;
   }

   .meta-node--group {
      margin-bottom: 0.125rem;
   }

   .meta-node__trigger {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      width: 100%;
      padding: 0.35rem 0.5rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--va-text-primary);
      font-size: 0.8125rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
         background: var(--va-background-element, rgba(0, 0, 0, 0.04));
      }
   }

   .meta-node__chevron {
      flex-shrink: 0;
      color: var(--va-text-secondary);
      opacity: 0.8;
   }

   .meta-node__label {
      font-weight: 700;
      line-height: 1.4;
   }

   .meta-node__children {
      padding-left: var(--meta-indent);
      border-left: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      margin-left: 0.375rem;
      margin-top: 0.125rem;
      margin-bottom: 0.25rem;
   }

   .meta-node--row {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0;
      padding: 0.25rem 0.5rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      border-radius: 4px;
      min-width: 0;

      &:hover {
         background: var(--va-background-secondary, rgba(0, 0, 0, 0.02));
      }
   }

   .meta-node__key {
      font-weight: 700;
      color: var(--va-text-secondary);
      letter-spacing: 0.02em;
      flex-shrink: 0;
   }

   .meta-node__sep {
      margin: 0 0.35rem;
      color: var(--va-text-secondary);
      opacity: 0.5;
      flex-shrink: 0;
   }

   .meta-node__value {
      color: var(--va-text-primary);
      word-break: break-word;
      min-width: 0;

      &--link {
         color: var(--va-primary);
         text-decoration: underline;
         text-underline-offset: 2px;

         &:hover {
            opacity: 0.85;
         }
      }
   }

   .meta-expand-enter-active,
   .meta-expand-leave-active {
      transition: opacity 0.15s ease, transform 0.15s ease;
   }

   .meta-expand-enter-from,
   .meta-expand-leave-to {
      opacity: 0;
      transform: translateY(-2px);
   }
</style>
