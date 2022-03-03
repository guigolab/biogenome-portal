<template>
    <b-row>
        <b-col lg="4">
            <tree-browser-component/>
        </b-col>
        <b-col lg="8">
            <organisms-component/>
        </b-col>
        <router-view/>
    </b-row>
</template>

<script>
import OrganismsComponent from '../components/organism/OrganismsComponent.vue';
import TreeBrowserComponent from '../components/taxon/TreeBrowserComponent.vue'

export default {
    name: 'home-page',
    components: {
        TreeBrowserComponent,
        OrganismsComponent,
    }


}
</script>
