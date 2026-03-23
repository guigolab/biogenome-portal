<template>
   <div class="ecf">
      <div
         v-for="(group, idx) in checklist.descriptor.field_group"
         v-show="activeGroupIndex === undefined || idx === activeGroupIndex"
         :key="group.name.text"
         class="ecf__group"
      >
         <div class="ecf__group-header">
            <h3 class="ecf__group-title">{{ group.name.text }}</h3>
            <p v-if="group.description" class="ecf__group-desc">{{ group.description.text }}</p>
         </div>

         <div class="ecf__fields">
            <template v-if="Array.isArray(group.field)">
               <div v-for="field in group.field" :key="field.name.text" class="ecf__field">
                  <CmsInput
                     v-if="field.field_type.text_field"
                     v-model="sampleStore.characterics[field.name.text]"
                     :label="field.label.text"
                     :required="field.mandatory.text === 'mandatory'"
                     :hint="field.description?.text"
                     clearable
                     :rules="textFieldRules(field)"
                  />
                  <CmsSelect
                     v-else-if="field.field_type.text_choice_field"
                     v-model="sampleStore.characterics[field.name.text]"
                     :label="field.label.text"
                     :required="field.mandatory.text === 'mandatory'"
                     :hint="field.description?.text"
                     clearable
                     :options="field.field_type.text_choice_field.text_value.map((opt: any) => opt.value.text)"
                     :rules="choiceRules(field)"
                  />
                  <CmsInput
                     v-else-if="field.field_type.text_area_field"
                     v-model="sampleStore.characterics[field.name.text]"
                     type="textarea"
                     :rows="4"
                     :label="field.label.text"
                     :required="field.mandatory.text === 'mandatory'"
                     :hint="field.description?.text"
                     clearable
                     :rules="textareaRules(field)"
                  />
               </div>
            </template>

            <template v-else>
               <div class="ecf__field">
                  <CmsInput
                     v-if="group.field.field_type.text_field"
                     v-model="sampleStore.characterics[group.field.name.text]"
                     :label="group.field.label.text"
                     :required="group.field.mandatory.text === 'mandatory'"
                     :hint="group.field.description?.text"
                     clearable
                     :rules="textFieldRules(group.field)"
                  />
                  <template v-else-if="group.field.field_type.text_choice_field">
                     <CmsSelect
                        v-if="Array.isArray(group.field.field_type.text_choice_field.text_value)"
                        v-model="sampleStore.characterics[group.field.name.text]"
                        :label="group.field.label.text"
                        :required="group.field.mandatory.text === 'mandatory'"
                        :hint="group.field.description?.text"
                        clearable
                        :options="group.field.field_type.text_choice_field.text_value.map((opt: any) => opt.value.text)"
                        :rules="choiceRules(group.field)"
                     />
                     <CmsSelect
                        v-else
                        v-model="sampleStore.characterics[group.field.name.text]"
                        :label="group.field.label.text"
                        :required="group.field.mandatory.text === 'mandatory'"
                        :hint="group.field.description?.text"
                        clearable
                        :options="[group.field.field_type.text_choice_field.text_value.value.text]"
                        :rules="choiceRules(group.field)"
                     />
                  </template>
                  <CmsInput
                     v-else-if="group.field.field_type.text_area_field"
                     v-model="sampleStore.characterics[group.field.name.text]"
                     type="textarea"
                     :rows="4"
                     :label="group.field.label.text"
                     :required="group.field.mandatory.text === 'mandatory'"
                     :hint="group.field.description?.text"
                     clearable
                     :rules="textareaRules(group.field)"
                  />
               </div>
            </template>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { useSampleStore } from '../../../stores/sample-store'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsSelect from '../ui/CmsSelect.vue'

   defineProps<{
      checklist: Record<string, any>
      /** When provided, only the group at this index is rendered. */
      activeGroupIndex?: number
   }>()

   const sampleStore = useSampleStore()

   function textFieldRules(field: Record<string, any>) {
      return [
         (v: string) => {
            if (field.mandatory.text === 'mandatory' && !v) {
               return `${field.name.text} is mandatory, please fill it.`
            }
            if (v && field.field_type.text_field.regex_value) {
               const regex = new RegExp(field.field_type.text_field.regex_value.text)
               if (!regex.test(v)) {
                  return `Invalid input. Expected format: ${field.field_type.text_field.regex_value.text}`
               }
            }
            return true
         },
      ]
   }

   function choiceRules(field: Record<string, any>) {
      return [
         (v: string) =>
            !(field.mandatory.text === 'mandatory' && !v) || `${field.name.text} is mandatory, fill it`,
      ]
   }

   function textareaRules(field: Record<string, any>) {
      return [
         (v: string) =>
            !(field.mandatory.text === 'mandatory' && !v) || `${field.name.text} is mandatory, fill it`,
      ]
   }
</script>

<style lang="scss" scoped>
   .ecf {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
   }

   .ecf__group {
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      border-radius: 10px;
      overflow: hidden;
      font-family: var(--cms-font);
   }

   .ecf__group-header {
      padding: 0.875rem 1.125rem 0.75rem;
      border-bottom: 1px solid var(--cms-border);
      background: var(--cms-bg-surface);
   }

   .ecf__group-title {
      margin: 0 0 0.2rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--cms-text);
      letter-spacing: -0.01em;
   }

   .ecf__group-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      line-height: 1.45;
   }

   .ecf__fields {
      padding: 1rem 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .ecf__field {
      width: 100%;
   }
</style>
