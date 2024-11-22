<template>
    <Accordion lazy value="0">
        <AccordionPanel v-for="f, index in filters" :key="f.key" :value="index">
            <AccordionHeader>
                <span class="flex items-center gap-2 w-full">
                    <i :class="filterDetails[f.type].icon" />
                    <span class="font-bold whitespace-nowrap">{{ useLabel(f.key)
                        }}</span>
                </span>
            </AccordionHeader>
            <AccordionContent>
                <SelectSwitch @valueChange="(v: any) => updateSearchForm(f, v)" :filter="f"
                    v-if="f.type === 'checkbox'" />
                <SelectField @valueChange="(v: any) => updateSearchForm(f, v)" :model="model" :filter="f"
                    v-else-if="f.type === 'select'" />
                <DateField @valueChange="(v: any) => updateSearchForm(f, v)" :filter="f"
                    v-else-if="f.type === 'date'" />
                <RangeField @valueChange="(v: any) => updateSearchForm(f, v)" :filter="f" :model="model"
                    v-else-if="f.type === 'range'" />
                <!-- <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <div>

                    </div>
                    <div v-if="name === 'Ranges'">
                        <div v-for="f in filters">

                        </div>
                    </div>
                    <div v-else>
                        <div v-for="f in filters">
                            <DynamicLabel :fieldKey="f.key">
                                <component :is="getFieldComponent(f.type)" :model="model" :filter="f" :key="f.key"
                                    @valueChange="(v: any) => updateSearchForm(f, v)">
                                </component>
                            </DynamicLabel>
                        </div>

                    </div>

                </div> -->
            </AccordionContent>
        </AccordionPanel>
    </Accordion>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { ConfigFilter, DataModels } from '../data/types';
import { useItemStore } from '../stores/items-store';
import DateField from './inputs/DateField.vue';
import SelectField from './inputs/SelectField.vue';
import SelectSwitch from './inputs/SelectSwitch.vue';
import { useLabel } from '../composable/useLabel';
import RangeField from './inputs/RangeField.vue';
const itemStore = useItemStore()

const props = defineProps<{
    model: DataModels
}>()

const filterDetails = {
    input: {
        label: "Search",
        description: "Use this field to enter keywords or text to filter the results based on specific terms.",
        icon: "pi pi-search",
    },
    select: {
        label: "Dropdown Filter",
        description: "Choose from predefined options in the dropdown to refine your search or data selection.",
        icon: "pi pi-filter",
    },
    date: {
        label: "Date Range",
        description: "Specify a date or date range to filter results by time period or relevant events.",
        icon: "pi pi-calendar",
    },
    range: {
        label: "Numeric Range",
        description:
            "Adjust the slider to filter results within a specific range of numerical values (e.g., sizes, counts).",
        icon: "pi pi-sliders-h",
    },
    checkbox: {
        label: "Toggle Options",
        description: "Enable or disable specific options to include or exclude certain criteria from your results.",
        icon: "pi pi-check-square",
    },
};
// Computed Filters
const filters = computed(() =>
    itemStore.stores[props.model]?.filters as ConfigFilter[] || []
);

async function updateSearchForm(filter: ConfigFilter, value: any) {

    await itemStore.updateFilter(props.model, { ...filter, value })
}

</script>