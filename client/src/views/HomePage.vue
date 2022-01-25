<template>
    <!-- <b-row>
        <b-col cols="2"/>
        <b-col cols="8">
            <filter-component :prepend-select="prependSelect" :options="options" :placeholder="getDescription(option)"/>
        </b-col>
        <b-col cols="2"/>
    </b-row> -->
    <b-row>
        <!-- <tree-view-container></tree-view-container> -->
        <b-col cols="4">
            <tree-browser-component/>
        </b-col>
        <b-col cols="8">
            <taxon-component></taxon-component>
        </b-col>
    </b-row>
</template>

<script>
// import FilterComponent from '../components/FilterComponent.vue';
import TaxonComponent from '../components/TaxonComponent.vue';
// import TreeViewContainer from '../components/TreeViewContainer.vue'
import TreeBrowserComponent from '../components/TreeBrowserComponent.vue'

export default {
    name: 'home-page',
    data() {
      return {
        option: 'organisms',
        options: [
          { item: 'samples', name: 'Search Samples'},
          { item: 'organisms', name: 'Search Species' }, // add here status tracking advanced filter
          { item: 'status tracking', name: 'Search by Status Tracking', notEnabled: true },
        ],
        prependSelect: true
      }
    },
    methods:{
        getDescription(option){
            console.log(option)
            return this.options.filter(opt => opt.item === option)[0].name
        }
    },
    components: {
        TaxonComponent,
        TreeBrowserComponent,
        // FilterComponent,
    }

}
</script>
