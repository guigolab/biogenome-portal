<template>
    <b-input-group>
        <b-input-group-prepend v-if="prependSelect">
            <b-form-select
                style="border-radius: 1.25rem 0 0 1.25rem; font-weight:bold; color:black"
                value-field="item"
                text-field="name"
                v-model="option"
                :options="options"
            >
            </b-form-select>
        </b-input-group-prepend>
        <b-form-input ref="filter"
            id="filter-input"
            style="border-radius: 0 1.25rem 1.25rem 0"
            v-model="filter"
            type="search"
            :placeholder="'in ' + taxName"
        >
        </b-form-input>
    </b-input-group>
</template>
<script>
import {BInputGroup, BFormInput, BFormSelect,BInputGroupPrepend} from 'bootstrap-vue'
import {mapFields} from '../../utils/helper'

export default {
    props:['placeholder', 'prependSelect', 'options'],
    components: {BInputGroup, BInputGroupPrepend, BFormSelect, BFormInput},
    computed: {
        ...mapFields({
            fields: ['filter','option', 'taxName'],
            module: 'portal',
            mutation: 'portal/setField' 
        })
    }
}
</script>