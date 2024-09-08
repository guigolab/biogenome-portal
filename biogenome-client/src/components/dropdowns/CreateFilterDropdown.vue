<template>
    <VaButtonDropdown v-model="show" :stateful="false" left-icon preset="primary" stickToEdges
        :closeOnContentClick="false" icon="add" label="Filter">
        <div class="w-200">
            <div class="p-4">
                <VaInput label="Field name" v-model="filter.field" />

            </div>
            <div class="p-4">
                <VaInput label="Field value" v-model="filter.value" />

            </div>
            <div class="p-4">
                <VaButton :disabled="isDisabled" @click="createFilter"> {{ t('buttons.submit') }} </VaButton>
            </div>

        </div>
    </VaButtonDropdown>

</template>
<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
    model: string
}>()

const show = ref(false)

const { t } = useI18n()
const itemStore = useItemStore()

const filter = reactive({
    field: '',
    value: ''
})

const isDisabled = computed(() => !filter.field || !filter.value)

async function createFilter() {
    itemStore.stores[props.model].searchForm[filter.field] = filter.value
    await itemStore.fetchItems()
    show.value = false
    filter.field = ""
    filter.value = ""
}

</script>