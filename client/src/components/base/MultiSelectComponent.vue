<template>
    <div>
    <b-list-group>
        <b-list-group-item button :active="isActive(index)" @click="handleSelect(index)" v-for="(project,index) in bioprojects" :key="project.accession">
            {{project.title}}
        </b-list-group-item>
    </b-list-group>
  </div>
</template>  
<script>
import {BListGroup,BListGroupItem} from 'bootstrap-vue'
import portalService from '../../services/DataPortalService'
export default {
    data(){
        return{
            bioprojects:[],
            selected:[]
        }
    },
    components:{BListGroup,BListGroupItem},
    created(){
        portalService.getRootProjectChildren()
        .then(response => {
            this.bioprojects = response.data
        })
    },
    methods:{
        handleSelect(index){
            console.log(index)
        },
        isActive(index){
            console.log('here: '+index)
        }
    }
}
</script>