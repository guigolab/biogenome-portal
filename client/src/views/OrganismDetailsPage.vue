<template>
<b-row>
    <b-col>
        <organism-details-component v-if="organism" :organism="organism"/>
    </b-col>
</b-row>

</template>
<script>
import OrganismDetailsComponent from '../components/organism/OrganismDetailsComponent.vue'
import portalService from '../services/DataPortalService'

export default {
    props: ['name'],
    data(){
        return {
            organism:null
        }
    },
    watch:{
        name: function(name){
            this.getOrganism(name)
        }
    },
    created(){
        this.getOrganism(this.name)
    },
    methods:{
        getOrganism(name){
            portalService.getOrganism(name)
            .then(response => {
                this.organism = response.data
                this.$store.commit('portal/setBreadCrumb', {value: {text: name, to: {name: 'organism-details', params:{name: name}}}})
            })
        }
    },
    components: {
        OrganismDetailsComponent
    }
}
</script>
