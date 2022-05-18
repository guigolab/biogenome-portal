<template>
<div v-if="assembly.assembly_name">
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
</div>
</template>
<script>
import {BLink,BCard,BCardText} from 'bootstrap-vue'
import portalService from '../../services/DataPortalService'

export default {
    components:{BLink,BCard,BCardText},
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