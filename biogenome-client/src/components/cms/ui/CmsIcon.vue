<template>
   <span class="cms-icon" :style="sizeStyle" aria-hidden="true">
      <i :class="iconClass" />
   </span>
</template>

<script setup lang="ts">
   import { computed } from 'vue'

   const props = withDefaults(
      defineProps<{
         /** Font Awesome icon name, e.g. `fa-users` or `users` */
         name: string
         /** CSS font-size: `small`, or any valid length (e.g. `0.65rem`, `1rem`) */
         size?: string
      }>(),
      {},
   )

   const iconClass = computed(() => {
      const n = props.name.trim()
      if (n.startsWith('fa-')) return `fas ${n}`
      return `fas fa-${n}`
   })

   const sizeStyle = computed(() => {
      const s = props.size
      if (!s) return { fontSize: '1em' }
      if (s === 'small') return { fontSize: '0.75rem' }
      return { fontSize: s }
   })
</script>

<style lang="scss" scoped>
   .cms-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;

      i {
         font-style: normal;
      }
   }
</style>
