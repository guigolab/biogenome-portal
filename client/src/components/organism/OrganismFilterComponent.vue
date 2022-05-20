<template>
    <b-row>
        <b-col lg="7">
            <multi-select-component  v-if="projectAccession"/>
        </b-col>
        <b-col lg="5">
            <filter-component :options="options" :prependSelect="true"/>
        </b-col>
        <!-- <b-col lg="4"/> -->
        <b-col class="checkbox-wrapper">
            <b-form-checkbox
                id="select-mode-opt"
                inline
                switch
                v-model="onlySelectedData"
                name="local_samples-checkbox"
            >
                <p id="switch-description">Only selected</p>
            </b-form-checkbox>
            <b-tooltip target="switch-description">
               Retrieve only selected data ex: retrieve <stong>only</stong> organisms with 'Submitted Samples' or <stong>only</stong> 'Submitted Samples' and 'Submitted Assemblies'
            </b-tooltip>
            <b-form-checkbox-group :options="checkboxOptions" v-model="selectedData"/>
            <b-icon-arrow-clockwise variant="primary" @mouseenter="animation='spin-pulse'" @mouseleave="animation=''" :animation="animation" font-scale="2" id="refresh-action" @click="resetFilters()"/>
            <b-tooltip target="refresh-action">
                Refresh filters
            </b-tooltip>
        </b-col>
    </b-row>
</template>
<script>
import {BFormCheckboxGroup, BFormCheckbox,BTooltip,BIconArrowClockwise
// BInputGroupAppend,BFormGroup
} from 'bootstrap-vue'
import {mapFields} from '../../utils/helper'
import FilterComponent from '../base/FilterComponent.vue'
import {PROJECT_ACCESSION} from '../../utils/static-config'
import MultiSelectComponent from '../base/MultiSelectComponent.vue'
import {dataOptions} from '../../utils/static-config'
export default {
    data(){
        return {
            options: [{name:'Species name',item:'species_name'},{name:'TaxID',item:'taxid'}, {name:'Common name',item:'common_name'},{name:'ToLID', item:'tolid'}],
            checkboxOptions:dataOptions,
            animation:'',
            projectAccession: PROJECT_ACCESSION
        }
    },
    computed: {
        ...mapFields({
            fields: ['selectedData','onlySelectedData','selectedBioproject'],
            module: 'portal',
            mutation: 'portal/setField'      
        }),
    },
    watch:{
        selectedBioproject(){
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        },
        onlySelectedData(){
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        },
        selectedData(){
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        }
    },
    components:{
        BFormCheckbox,BFormCheckboxGroup,BTooltip,
        BIconArrowClockwise,FilterComponent,MultiSelectComponent
    },
    methods:{
        resetFilters(){
            this.$store.dispatch('portal/resetFilters')
        }
    }

}
</script>
<style scoped>
.checkbox-wrapper{
    margin-top:25px;
    display: flex;
    justify-content: space-between;
}

#refresh-action{
    cursor: pointer;
}
#refresh-action:hover{
    rotate: (45deg);
}

</style>