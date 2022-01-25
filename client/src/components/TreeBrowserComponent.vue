<template>
    <b-overlay variant='white' :show="show">
        <b-container class="router-container" fluid>
            <b-row>
                <b-col>
                    <tree-list-component v-if="tree" class="tree-wrapper" :item="tree"></tree-list-component>
                </b-col>
            </b-row>
        </b-container>
    </b-overlay>
</template>
<script>
import {BOverlay} from 'bootstrap-vue'
import TreeListComponent from "./TreeListComponent.vue"


export default {
    computed: {
        tree(){
            return this.$store.getters['portal/getState'].tree
        }
    },
    mounted(){
        if(this.tree === null){
            this.$store.commit('portal/setTree',{value: 'Eukaryota'})
        }
    },
    components:{
        TreeListComponent,
        BOverlay
    }
}
</script>
<style>
.tree-wrapper{
    height: 75vh;
    cursor: pointer;
    list-style-type: none;
    overflow: auto;
}
 /* .tree-viewer {
    width: 100%;
    height: 75vh;
    display: inline-block;
    overflow: auto;
    padding: 15px; 

} */
</style>
