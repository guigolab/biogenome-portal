<template>
    <b-row>
        <b-col lg="7">
            <b-input-group>
                <b-input-group-prepend>
                    <b-input-group-text id="bioprojects-select" class="prepend-custom-text">INSDC Bioproject</b-input-group-text>
                </b-input-group-prepend>
                <b-form-select style="border-radius: 0 1.25rem 1.25rem 0" v-model="selectedBioproject" :options="bioprojects">
                </b-form-select>
            </b-input-group>
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
            <b-form-checkbox-group :options="checkboxOptions" v-model="selectedCheckboxes"/>
            <b-icon-arrow-clockwise @mouseenter="animation='spin-pulse'" @mouseleave="animation=''" :animation="animation" font-scale="2" id="refresh-action" @click="resetFilters()"/>
            <b-tooltip target="refresh-action">
                Clear all filters
            </b-tooltip>
        </b-col>
    </b-row>
</template>
<script>
import {BFormSelect, BFormCheckboxGroup, BFormCheckbox,BInputGroupText,
BInputGroup, BInputGroupPrepend,BTooltip,BIconArrowClockwise
// BInputGroupAppend,BFormGroup
} from 'bootstrap-vue'
import {mapFields} from '../../utils/helper'
import FilterComponent from '../base/FilterComponent.vue'
import portalService from '../../services/DataPortalService'
import {PROJECT_ACCESSION} from '../../utils/static-config'

export default {
    data(){
        return {
            options: [{name:'Species name',item:'species_name'},{name:'TaxID',item:'taxid'}, {name:'Common name',item:'common_name'},{name:'ToLID', item:'tolid'}],
            checkboxOptions:[
                {text: 'Acquired samples', value: 'local_samples'},
                {text: 'Submitted samples', value: 'insdc_samples'},
                {text: 'Submitted reads', value: 'experiments'},
                {text: 'Submitted assemblies', value: 'assemblies'},
            ],
            selectedCheckboxes:[],
            bioprojects:[],
            animation:''
        }
    },
    computed: {
        ...mapFields({
            fields: ['onlySelectedData','selectedBioproject'],
            module: 'portal',
            mutation: 'portal/setField'      
        })
    },
    watch:{
        selectedCheckboxes(values){
            this.checkboxOptions
            .map(it => {return it.value})
            .forEach(it => {
                if (values.filter(v => v === it).length){
                    this.$store.commit('portal/setField', {label: it, value:true})
                }else{
                    this.$store.commit('portal/setField', {label: it, value:false})
                }
            })
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        },
        selectedBioproject(){
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        },
        onlySelectedData(){
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        }
    },
    components:{BFormSelect,BFormCheckbox, BFormCheckboxGroup,
    BInputGroupText,BInputGroup, BInputGroupPrepend,BTooltip,BIconArrowClockwise,
    //  BInputGroup, BInputGroupPrepend, BInputGroupAppend,BFormGroup,
    FilterComponent},
    created(){
        portalService.getRootProjectChildren()
        .then(response => {
            const bioprojects = response.data.map(bp => { return {text: bp.title, value:bp.accession}})
            //create append all to root_project
            const root_project = bioprojects.find(el => el.value === PROJECT_ACCESSION)
            const groupedChildren = {label: 'Children projects', options:bioprojects.filter(bp => bp.value !== root_project.value)}
            if(groupedChildren){
                this.bioprojects = [root_project, groupedChildren]
            }else {
                this.bioprojects = [root_project]
            }
        })
    },
    methods:{
        resetFilters(){
            this.selectedCheckboxes=[]
            this.$store.dispatch('portal/resetFilters')
        }
    }

}
</script>
<style scoped>
.prepend-custom-text{
    background: white;
    color: black;
    font-weight: bold;
}
.checkbox-wrapper{
    margin-top:25px;
    display: flex;
    justify-content: space-between;
}
#bioprojects-select{
    border-radius: 1.25rem 0 0 1.25rem;
}
#refresh-action{
    cursor: pointer;
}
#refresh-action:hover{
    rotate: (45deg);
}

</style>