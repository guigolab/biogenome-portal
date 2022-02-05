<template>
    <b-row>
        <b-col lg="4">
            <tree-browser-component/>
        </b-col>
        <b-col lg="8">
            <taxon-component/>
        </b-col>
        <router-view/>
    </b-row>
</template>

<script>
import TaxonComponent from '../components/TaxonComponent.vue';
import TreeBrowserComponent from '../components/TreeBrowserComponent.vue'

export default {
    name: 'home-page',
    components: {
        TaxonComponent,
        TreeBrowserComponent,
    }

}
</script>
