<template>
    <b-row>
        <b-col>
            <div>
                <b-input-group>
                    <b-input-group-prepend v-if="prependSelect">
                        <b-form-select
                            value-field="item"
                            text-field="name"
                            v-model="option"
                            :options="options"
                        >
                        </b-form-select>
                    </b-input-group-prepend>
                    <b-form-input ref="filter"
                        id="filter-input"
                        v-model="filter"
                        type="search"
                        :placeholder="placeholder"
                    >
                    </b-form-input>
                    <b-input-group-append>
                        <b-button :disabled="!filter" @click="filter = ''">Clear</b-button>
                    </b-input-group-append>
                </b-input-group>
            </div>
        </b-col>
    </b-row>
</template>
<script>
import {BInputGroup,BInputGroupAppend, BButton, BFormInput, BFormSelect,BInputGroupPrepend} from 'bootstrap-vue'
import {mapFields} from '../../helper'

export default {
    props:['placeholder', 'prependSelect', 'options'],
    components: {BInputGroup, BInputGroupAppend, BInputGroupPrepend, BFormSelect,BButton, BFormInput},
    computed: {
        ...mapFields({
            fields: ['filter','option'],
            module: 'portal',
            mutation: 'portal/setField' 
        })
    }
}
</script>