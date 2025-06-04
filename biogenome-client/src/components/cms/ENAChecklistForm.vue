<template>
    <div class="row" v-for="group in checklist.descriptor.field_group">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <h3 class="va-h5">
                        {{ group.name.text }}
                    </h3>
                    <p v-if="group.description" class="va-text-secondary">
                        {{ group.description.text }}
                    </p>
                </VaCardContent>
                <VaCardContent>
                    <div v-if="Array.isArray(group.field)" class="row">
                        <div v-for="field in group.field" class="flex lg12 md12 sm12 xs12">
                            <VaInput v-if="field.field_type.text_field"
                                :required-mark="field.mandatory.text === 'mandatory'"
                                v-model="sampleStore.characterics[field.name.text]" :label="field.label.text"
                                :messages="[field.description?.text]" clearable :rules="[
                                    (v: string) => {
                                        if (field.mandatory.text === 'mandatory' && !v) {
                                            return `${field.name.text} is mandatory, please fill it.`;
                                        }
                                        if (v && field.field_type.text_field.regex_value) {
                                            const regex = new RegExp(field.field_type.text_field.regex_value.text);
                                            if (!regex.test(v)) {
                                                return `Invalid input. Expected format: ${field.field_type.text_field.regex_value.text}`;
                                            }
                                        }
                                        return true;
                                    }
                                ]">
                            </VaInput>
                            <VaSelect :required-mark="field.mandatory.text === 'mandatory'" clearable v-else-if="field.field_type.text_choice_field"
                                v-model="sampleStore.characterics[field.name.text]" :label="field.label.text"
                                :messages="[field.description?.text]"
                                :options="field.field_type.text_choice_field.text_value.map((opt: any) => opt.value.text)"
                                :rules="[(v: any) => !(field.mandatory.text === 'mandatory' && !v) || `${field.name.text} is mandatory, fill it`]">
                            </VaSelect>
                            <VaTextarea :required-mark="field.mandatory.text === 'mandatory'" clearable style="width: 100%;" v-else-if="field.field_type.text_area_field"
                                v-model="sampleStore.characterics[field.name.text]" :label="field.label.text"
                                :messages="[field.description?.text]"
                                :rules="[(v: string) => !(field.mandatory.text === 'mandatory' && !v) || `${field.name.text} is mandatory, fill it`]">
                            </VaTextarea>
                        </div>
                    </div>
                    <div v-else class="row">
                        <div v-if="group.field.field_type.text_field" class="flex lg12 md12 sm12 xs12">
                            <VaInput :required-mark="group.field.mandatory.text === 'mandatory'" clearable v-model="sampleStore.characterics[group.field.name.text]"
                                :label="group.field.label.text" :messages="[group.field.description?.text]" :rules="[
                                    (v: string) => {
                                        if (group.field.mandatory.text === 'mandatory' && !v) {
                                            return `${group.field.name.text} is mandatory, please fill it.`;
                                        }
                                        if (v && group.field.field_type.text_field.regex_value) {
                                            const regex = new RegExp(group.field.field_type.text_field.regex_value.text);
                                            if (!regex.test(v)) {
                                                return `Invalid input. Expected format: ${group.field.field_type.text_field.regex_value.text}`;
                                            }
                                        }
                                        return true;
                                    }
                                ]">
                            </VaInput>
                        </div>
                        <div v-else-if="group.field.field_type.text_choice_field" class="flex lg12 md12 sm12 xs12">
                            <VaSelect :required-mark="group.field.mandatory.text === 'mandatory'" clearable
                                v-if="Array.isArray(group.field.field_type.text_choice_field.text_value)"
                                v-model="sampleStore.characterics[group.field.name.text]" :label="group.field.label.text"
                                :messages="[group.field.description?.text]"
                                :options="group.field.field_type.text_choice_field.text_value.map((opt: any) => opt.value.text)"
                                :rules="[(v: any) => !(group.field.mandatory.text === 'mandatory' && !v) || `${group.field.name.text} is mandatory, fill it`]">
                            </VaSelect>
                            <VaSelect :required-mark="group.field.mandatory.text === 'mandatory'" clearable v-else v-model="sampleStore.characterics[group.field.name.text]"
                                :label="group.field.label.text" :messages="[group.field.description?.text]"
                                :options="[group.field.field_type.text_choice_field.text_value.value.text]"
                                :rules="[(v: any) => !(group.field.mandatory.text === 'mandatory' && !v) || `${group.field.name.text} is mandatory, fill it`]">
                            </VaSelect>
                        </div>
                        <div v-else-if="group.field.field_type.text_area_field" class="flex lg12 md12 sm12 xs12">
                            <VaTextarea :required-mark="group.field.mandatory.text === 'mandatory'" clearable style="width: 100%;"
                                v-model="sampleStore.characterics[group.field.name.text]"
                                :label="group.field.label.text" :messages="[group.field.description?.text]"
                                :rules="[(v: string) => !(group.field.mandatory.text === 'mandatory' && !v) || `${group.field.name.text} is mandatory, fill it`]">
                            </VaTextarea>
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSampleStore } from '../../stores/sample-store';


const props = defineProps<{
    checklist: Record<string, any>
}>()

const sampleStore = useSampleStore()


</script>