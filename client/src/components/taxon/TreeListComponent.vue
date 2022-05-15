<template>
<div>
<li class="tree-container" :id="item.name">
    <div class="node-wrapper">
        <div v-if="isFolder" @click="toggle(item)" class="d-flex justify-content-between align-items-center node-container">
            <div v-if="item.isOpen">
                <b-icon-slash-circle variant="success" font-scale="1" rotate="45"></b-icon-slash-circle>
            </div>
            <div v-else>
                <b-icon-plus-circle variant="success" font-scale="1"></b-icon-plus-circle>
            </div>
            <div class="taxon-title bold">
            {{item.name}} <p class="node-rank">{{'('+item.rank+')'}}</p>
            </div>
            <div class="icons-container">
                <b-link @click.stop class="to-tree-link" :to="{name: 'tree-of-life', params: {node: item.name}}">
                    <b-icon-diagram3 :id="item.name" font-scale="1"></b-icon-diagram3>
                </b-link>
                <b-badge href="#" @click.stop="toTable(item.name)" variant="success" pill>{{item.leaves}} </b-badge>
            </div>
        </div>
        <!-- trick to avoid undefined display on vue transition -->
        <div v-else-if="isFolder === 0"
         class="node-container">
            <b-link :to="{name:'organism-details', params: {name: item.name}}">{{item.name + ' ('+ item.rank+')'}}</b-link>
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

export default {
    name: 'tree-list-component',
    props:['item'],
    components:{ BLink, BIconSlashCircle, BIconPlusCircle,
            BIconDiagram3, BBadge},
    computed: {
          isFolder() {
            return this.item.children && this.item.children.length
          }
        },
    methods: {
        toggle(item){
            if(!item.children.filter(ch => ch.name).length)
            {
                portalService.getTaxonChildren(item.name)
                .then(response => {
                    const children = response.data['children']
                    this.$store.commit('portal/assignChildren', {label: item.name, value: children})
                })
            }
            this.$store.commit('portal/toggleNode', {value: item.name})

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
  padding-left:0.4rem !important;
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
    border: 3px solid #dee2e6;
    padding: 0.5rem;
    margin: 0 0 .25rem 0;
    border-radius: 1.25rem 0 0 1.25rem;
    cursor: pointer;
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
.node-container:hover{
border-color: #28a745;
}
.node-rank{
margin: 0 !important;
width: fit-content;
font-weight: initial;
display: contents;
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