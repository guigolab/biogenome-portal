<template>
    <b-row>
        <b-col lg="4">
            <tree-browser-component/>
        </b-col>
        <b-col lg="8">
            <taxon-component></taxon-component>
        </b-col>
    </b-row>
</template>

<script>
import TaxonComponent from '../components/TaxonComponent.vue';
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
    components: {
        TaxonComponent,
        TreeBrowserComponent,
    }

}
</script>
