<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <div class="row">
                <div class="flex lg12">
                    <va-select
                        label="search by"
                        v-model="filterOption"
                        :options="['tolid','taxid','common_name','scientific_name']"
                        style="padding:10px"
                        :disabled="Boolean(filter)"
                    />
                </div>
            </div>
            <div class="row">
                <div class="flex lg12">
                    <va-input
                        label="filter"
                        placeholder="search organism"
                        v-model="filter"
                        style="padding:10px"
                    >
                        <template #appendInner>
                            <va-chip outline
                                :rounded="false"
                                :disabled="filter.length <= 1"
                                @click="$emit('onSearch',{option:filterOption,value:filter})"
                                icon="search"
                            >search</va-chip>
                            <va-chip outline
                                :rounded="false"
                                color="danger"
                                :disabled="filter.length <=1"
                                @click="reset()"
                                icon="remove"
                            >clear</va-chip>
                        </template>
                    </va-input>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import {ref,defineEmits} from "vue"

const filter = ref("")
const filterOption = ref('scientific_name')
const emits = defineEmits(['onSearch'])

function reset(){
    filter.value = ""
    filterOption.value = "scientific_name"
    emits('onSearch',{option: filterOption.value, value: filter.value})
}

</script>