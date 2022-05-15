<template>
<div v-if="assembly.assembly_name">
    <b-button @click="show = !show" pill variant="outline-success">See last imported assembly</b-button>
    <b-collapse :visible="show" id="collapse-1" class="mt-2">
    <b-card :title="assembly.assembly_name">
        <b-card-text>
            Created: {{recordDate}}
        </b-card-text>
        <b-card-text>
            Assembly Accession: <b-link target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/'+assembly.accession">{{assembly.accession}}</b-link>
        </b-card-text>
        <b-card-text>
            Sample Accession: <b-link :to="{name: 'sample-details', params:{accession:assembly.sample_accession}}">{{assembly.sample_accession}}</b-link>
        </b-card-text>

    </b-card>
    </b-collapse>
</div>
</template>
<script>
import {BLink,BCard,BButton,BCollapse,BCardText} from 'bootstrap-vue'
import portalService from '../../services/DataPortalService'

export default {
    components:{BLink,BCard,BButton,BCollapse,BCardText},
    data(){
        return{
            assembly:{},
            show:false
        }
    },
    computed:{
        recordDate(){
            if (this.assembly.created){
                return new Date(this.assembly.created.$date)
            }
            return null
        }
    },
    created(){
        portalService.getLastCreated('assemblies')
        .then(resp => {
            this.assembly=resp.data
        })
    }
}
</script>