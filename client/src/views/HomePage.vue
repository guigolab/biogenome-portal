<template>
    <b-container fluid class="router-container">
        <b-row>
            <b-col lg="3" md="4" style="overflow: auto;max-height:120px">
                <tree-bread-crumb-component/>
            </b-col>
            <b-col lg="9" md="8">
                <organism-filter-component/>
            </b-col>
        </b-row>
        <b-row>
            <b-col lg="3" md="4">
                <tree-browser-component/>
            </b-col>
            <b-col lg="9" md="8">
                <organisms-component/>
            </b-col>
            <router-view/>
        </b-row>
    </b-container>
</template>

<script>
// import LastPublishedBanner from '../components/base/LastPublishedBanner.vue';
import OrganismFilterComponent from '../components/organism/OrganismFilterComponent.vue';
import OrganismsComponent from '../components/organism/OrganismsComponent.vue';
import TreeBreadCrumbComponent from '../components/taxon/TreeBreadCrumbComponent.vue';
import TreeBrowserComponent from '../components/taxon/TreeBrowserComponent.vue'

export default {
    name: 'home-page',
    components: {
        TreeBrowserComponent,
        OrganismsComponent,
        TreeBreadCrumbComponent,
        OrganismFilterComponent,
    }
}
</script>
