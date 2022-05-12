<template>
<li class="tree-container" :id="item.name">
    <!-- <div @click="isFolder ? toggle(item) : toOrganismPage(item.name)" class="tax-node-container">
        <div class="icon-circle-container" v-if="item.isOpen">
            <b-icon-slash-circle font-scale="1" rotate="45"></b-icon-slash-circle>
        </div>
        <div v-else>
            <b-icon-plus-circle font-scale="1"></b-icon-plus-circle>
        </div>
        <b-card bg-variant="light" :title="item.name" :sub-title="item.rank">
            <b-link @click.stop class="to-tree-link" :to="{name: 'tree-of-life', params: {node: item.name}}">
                <b-icon-diagram3 icon='diagram3' :id="item.name" font-scale="1"></b-icon-diagram3>
            </b-link>
            <b-badge href="#" @click.stop="toTable(item.name)" variant="success" pill>{{item.leaves}} </b-badge>
        </b-card>
    </div> -->
    <b-container>
        <b-row @click="isFolder ? toggle(item) : toOrganismPage(item.name)">
            <b-col lg="1" class="slash-icon-container" v-if="isFolder">
                <div v-if="item.isOpen">
                    <b-icon-slash-circle font-scale="1" rotate="45"></b-icon-slash-circle>
                </div>
                <div v-else>
                    <b-icon-plus-circle font-scale="1"></b-icon-plus-circle>
                </div>
            </b-col>
            <b-col class="node-wrapper">
                <b-row>
                    <b-col :class="{bold: isFolder}">
                        <b-row>
                            <b-col>
                                {{item.name}}
                            </b-col>
                        </b-row>
                        <b-row>
                            <b-col class="tax-rank">
                                {{item.rank}}
                            </b-col>
                        </b-row>
                    </b-col>
                    <b-col class="actions-wrapper">
                        <b-link @click.stop class="to-tree-link" :to="{name: 'tree-of-life', params: {node: item.name}}">
                            <b-icon-diagram3 icon='diagram3' :id="item.name" font-scale="1"></b-icon-diagram3>
                        </b-link>
                        <b-badge href="#" @click.stop="toTable(item.name)" variant="success" pill>{{item.leaves}} </b-badge>
                    </b-col>
                </b-row>
            </b-col>
        </b-row>  
    </b-container>
    <Transition name="slide-fade">
    <ul v-show="item.isOpen" v-if="isFolder">
        <tree-list-component
            class="item"
            v-for="(child, index) in item.children"
            :key="index"
            :item="child"
        >
        </tree-list-component>
    </ul>
    </Transition>
</li>
</template>
<script>
import { BLink,BIconSlashCircle, BIconPlusCircle,
 BIconDiagram3, BBadge } from 'bootstrap-vue'
import portalService from '../../services/DataPortalService'
import {ROOTNODE} from '../../utils/static-config'

export default {
    name: 'tree-list-component',
    props:['item'],
    components:{ BLink, BIconSlashCircle, BIconPlusCircle,
            BIconDiagram3, BBadge},
    computed: {
          isFolder() {
            return this.item.children && this.item.children.length;
          }
        },
    methods: {
        toggle(item){
            if(item.name !== ROOTNODE)
            {
                portalService.getTaxonChildren(item.name)
                .then(response => {
                    const children = response.data['children']
                    this.$store.commit('portal/assignChildren', {label: item.name, value: children})
                })
            }
            this.$store.commit('portal/toggleNode', {value: item.name})

        },
        toOrganismPage(name){
            portalService.getOrganism(name)
            .then(response => {
                this.$store.commit('portal/setField', {label: 'organism', value: response.data})
            })
            this.$router.push({name:'organism-details', params: {name: name}})
        },
        toTable(name) {
            this.$store.commit('portal/setField', {label: 'taxName', value: name})
            this.$store.dispatch('portal/addTaxHistory')
            this.$store.commit('portal/setTree', {value: name})
            this.$root.$emit('bv::refresh::table', 'organisms-table')
        }
    },
}
</script>
<style scoped>

ul {
 padding-left:0.33rem !important;
}

.item {
  cursor: pointer;
  list-style-type: none;
}
.bold {
  font-weight: bold;
  width: 100%;
  display: grid;

}
.node-container {
    background-color: rgb(233, 236, 239);
    color: #495057;
    padding: 0.5rem;
    margin: 0.25rem;
    border-radius: 1.25rem 0 0 1.25rem;
}
#tree-leaves-button {
    margin-left: 0.3rem;
}

.taxon-title{
    margin-left: 0.2rem
}
.icons-container{
    display:contents
}
.to-tree-link{
    margin-right: 0.5rem
}
.tax-rank{
    font-size: 0.85rem;
}
.slash-icon-container, .actions-wrapper{
    padding: 1rem;
}
.node-wrapper{
    color: #495057;
    border-radius: 1.25rem 0 0 1.25rem;
    background-color: rgb(233, 236, 239);
}
.node-wrapper, .actions-wrapper{
    text-align: center;
}
.tax-node-container{
    padding: auto;
}
/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-fade-enter-active {
  transition: all .3s ease;
}
.slide-fade-leave-active {
  transition: all .8s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}
</style>