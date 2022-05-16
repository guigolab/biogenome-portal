<template>
<b-container fluid class="router-container">
<b-row>
    <b-col>
        <b-row>
        <b-col v-if="geojson" lg="5">
            <b-row class="map-container">
                <map-container :geojson="geojson"/>
            </b-row>
        </b-col>
        <b-col v-if="organism">
            <b-row>
                <b-col>
                    <b-row>
                        <b-col>
                            <div v-if="hasImage" class="mb-2" style="float:left">
                                <b-avatar id="species-image" :src="organism.image? 'data:image/jpeg;base64,'+organism.image : organism.image_url" size="7rem"></b-avatar>
                            </div>
                            <h2 >{{organism.organism}}</h2>
                            <status-badge-component :status="organism.trackingSystem"/>
                        </b-col>
                    <b-row>
                </b-col>
            </b-row>
            <b-row v-if="(organism.common_name.length && organism.common_name[0]) || organism.insdc_common_name">
                <b-col>
                    <h5>{{organism.common_name.join() || organism.insdc_common_name}}</h5>
                </b-col>
            </b-row>
            <b-row>
                <b-col style="font-size: 0.85rem">
                    <b-link v-for="node in reverseItems(organism.ordered_lineage)" :key="node.taxid" 
                    :to="{name: 'tree-of-life', params: {node: node.name}}"
                    >
                        {{node.name}} (<strong>{{node.rank}}</strong>)
                    </b-link>
                </b-col>
            </b-row>
        </b-col>
    </b-row>
    <organism-details-component v-if="organism" :organism="organism"/>
    </b-col>
</b-row>
</b-container>

</template>
<script>
import {BLink,BAvatar} from 'bootstrap-vue'
import OrganismDetailsComponent from '../components/organism/OrganismDetailsComponent.vue'
import portalService from '../services/DataPortalService'
import MapContainer from '../components/base/MapContainer.vue'
import StatusBadgeComponent from '../components/base/StatusBadgeComponent.vue'

export default {
    props: ['name'],
    data(){
        return {
            organism:null,
            geojson:null,
        }
    },
    watch:{
        name: function(name){
            console.log(name)
            this.getOrganism(name)
        }
    },
    computed:{
        hasImage(){
            return this.organism && (this.organism.image || this.organism.image_url)
        }
    },
    created(){
        this.getOrganism(this.name)
    },
    methods:{
        reverseItems(items) {
            return items.slice().reverse();
        },
        getOrganism(name){
            this.$store.dispatch('portal/showLoading')
            portalService.getOrganism(name)
            .then(response => {
                this.organism = response.data
                this.$store.commit('portal/setBreadCrumb', {value: {text: name, to: {name: 'organism-details', params:{name: name}}}})
                const records = [...this.organism.insdc_samples,...this.organism.local_samples].map(rec => rec._id)
                this.$store.dispatch('portal/hideLoading')
                return portalService.getCoordinatesBySampleIds({ids:records})
            })
            .then(response =>{
                if(response){
                    this.$nextTick(()=>{
                        this.geojson = {...response.data}
                    })
                }
            })
            .catch(e => {
                this.$store.dispatch('portal/hideLoading')
                console.log(e)
            })
        }
    },
    components: {
        OrganismDetailsComponent,BLink,BAvatar,
        MapContainer,StatusBadgeComponent
    }
}
</script>
<style scoped>
.map-container{
    width: 100%;
    height: 100%;
    min-height: 250px
}
</style>