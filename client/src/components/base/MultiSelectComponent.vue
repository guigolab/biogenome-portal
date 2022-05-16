<template>
<b-input-group>
    <b-input-group-prepend>
        <b-input-group-text id="bioprojects-select" class="prepend-custom-text">INSDC Bioproject</b-input-group-text>
    </b-input-group-prepend>
    <b-form-select style="border-radius: 0 1.25rem 1.25rem 0" v-model="selectedBioproject" :options="bioprojects">
    </b-form-select>
</b-input-group>
</template>  
<script>
import {BInputGroup,BFormSelect,BInputGroupPrepend,BInputGroupText} from 'bootstrap-vue'
import portalService from '../../services/DataPortalService'
import {mapFields} from '../../utils/helper'
import {PROJECT_ACCESSION} from '../../utils/static-config'
export default {
    data(){
        return{
            bioprojects:[],
        }
    },
    computed: {
        ...mapFields({
            fields: ['selectedBioproject'],
            module: 'portal',
            mutation: 'portal/setField'      
        })
    },
    components:{BInputGroup,BInputGroupPrepend,BInputGroupText,BFormSelect},
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
    }
}
</script>
<style scoped>
#bioprojects-select{
    border-radius: 1.25rem 0 0 1.25rem;
}
.prepend-custom-text{
    background: white;
    color: black;
    font-weight: bold;
}
</style>