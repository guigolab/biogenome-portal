<template>
<div>
<li class="tree-container" :id="item.name">
    <div class="node-wrapper">
        <div @click="isFolder ? toggle(item) : toOrganismPage(item.name) " class="d-flex justify-content-between align-items-center node-container">
            <div v-if="isFolder">
                <div v-if="item.isOpen">
                    <b-icon-slash-circle font-scale="1" rotate="45"></b-icon-slash-circle>
                </div>
                <div v-else>
                    <b-icon-plus-circle font-scale="1"></b-icon-plus-circle>
                </div>
            </div>       
            <div :class="{bold: isFolder}" class="taxon-title">
            {{item.name}} ({{item.rank}})
            </div>
            <div class="icons-container" v-if="isFolder">
                <b-link @click.stop class="to-tree-link" :to="{name: 'tree-of-life', params: {node: item.name}}">
                    <b-icon-diagram3 icon='diagram3' :id="item.name" font-scale="1"></b-icon-diagram3>
                </b-link>
                <b-badge href="#" @click.stop="toTable(item.name)" variant="success" pill>{{item.leaves}} </b-badge>
            </div>
        </div>
    </div>
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
</div>
</template>
<script>
import { BLink, BIconSlashCircle, BIconPlusCircle,
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
ul{
    padding-left:0.33rem !important;
}

.item {
  cursor: pointer;
  list-style-type: none;
}
.bold {
  font-weight: bold;
  width: 100%;
}
.node-container {
    background-color: rgb(233, 236, 239);
    color: #495057;
    padding: 0.5rem;
    margin: 0 0 .25rem 0;
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
.slide-fade-enter-active {
  transition: all .2s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-leave-active {
  transition: all .2s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}
</style>