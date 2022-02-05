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
@media screen and (max-width: 600px){
    .tree-wrapper{
        height: 33vh;
    }
}
@media screen and (min-width: 992px){
.tree-wrapper  {
    height: 70vh;
}
}
.tree-wrapper  {
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
