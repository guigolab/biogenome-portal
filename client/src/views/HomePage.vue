<template>
    <b-container fluid class="router-container">
        <b-row>
            <b-col lg="8" style="overflow: auto;min-height:50px">
                <tree-bread-crumb-component/>
            </b-col>
            <b-col lg="4">
                <filter-component :prependSelect="true" :options="options"/>
            </b-col>
        </b-row>
        <b-row>
            <b-col lg="3">
                <tree-browser-component/>
            </b-col>
            <b-col lg="9">
                <organisms-component/>
            </b-col>
            <router-view/>
        </b-row>
    </b-container>
</template>

<script>
import FilterComponent from '../components/base/FilterComponent.vue';
import OrganismsComponent from '../components/organism/OrganismsComponent.vue';
import TreeBreadCrumbComponent from '../components/taxon/TreeBreadCrumbComponent.vue';
import TreeBrowserComponent from '../components/taxon/TreeBrowserComponent.vue'

export default {
    name: 'home-page',
    data(){
        return {
            options: [{name:'Species name',item:'species_name'},{name:'TaxID',item:'taxid'}, {name:'Common name',item:'common_name'},{name:'ToLID', item:'tolid'}]
        }
    },
    components: {
        TreeBrowserComponent,
        OrganismsComponent,
        TreeBreadCrumbComponent,
        FilterComponent
    }


}
</script>
