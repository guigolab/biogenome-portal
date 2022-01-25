<template>
    <b-container class="router-container" fluid>
      <b-row >
        <b-col> 
              <b-button :disabled="taxName === 'Eukaryota'" 
                @click="resetTaxName()"
                block
                variant="outline-success" 
              >
                <b-row style="margin-bottom:0px">
                  <b-col style="text-align:start" cols="2">
                    <b-icon-x-circle></b-icon-x-circle>
                  </b-col>
                  <b-col style="text-align:center">
                    <strong> {{taxName.toUpperCase()}} </strong>
                  </b-col>
                  <b-col cols="2"/>
                </b-row>
              </b-button>
        </b-col>
      </b-row>
      <filter-component :filter="filter" :placeholder="'Search an organism in ' + taxName"/>
      <table-component 
        :field="fields"
        :items="organismsProvider"
        :busy.sync="isBusy"
        :filter="filter"
        :fields="fields"
        :current-page="currentPage"
        :per-page="perPage"
        :primary-key="'id'"
        :custom-fields="customFields"
        :id="tableId"
        :sticky-header="stickyHeader"
        >
        <template #cell(organism)="data">
          <b-link :to="{name: 'organism-details', params: {name: data.item.organism}}">
            {{data.item.organism}}
          </b-link>
        </template>
        <template #cell(trackingSystem)="data">
          <status-badge-component :status="data.item.trackingSystem"/>
            <b-badge pill variant='info' target="_blank" :href="'https://goat.genomehubs.org/records?record_id='+data.item.taxid+'&result=taxon&taxonomy=ncbi#'+data.item.organism">GoaT</b-badge>
        </template>
      </table-component>
      <pagination-component :per-page="perPage" :page-options="pageOptions" :total-rows="totalRows" :current-page="currentPage" :table-id="tableId"/>
    </b-container>
</template>

<script>
import portalService from "../services/DataPortalService"
import { BIconXCircle, BBadge,  BButton, BLink } from 'bootstrap-vue'
import TableComponent from './TableComponent.vue';
import FilterComponent from './FilterComponent.vue';
import PaginationComponent from './PaginationComponent.vue';
import {mapPortalFields} from '../helper'
import StatusBadgeComponent from './StatusBadgeComponent.vue';

export default {
  components: 
    {BLink, BIconXCircle, BBadge,
     BButton, TableComponent,PaginationComponent,
      FilterComponent,
      StatusBadgeComponent},
  computed: {
    ...mapPortalFields({
      fields: ['filter','taxName','perPage', 'totalRows','currentPage'],
      mutation: 'portal/setField'      
    })
  },
  data() {
    return {
      tableId:'organisms-table',
      pageOptions: [20,50,100],
      isBusy: false,
      stickyHeader: '70vh',
      fields: [
        {key: 'taxid', label: 'TaxId',sortable: true},
        {key: 'organism',label:'Scientific Name',sortable: true},
        {key:'commonName', label: 'Common Name', sortable: true},
        {key: 'trackingSystem', label:''}
      ]
        // {key: 'kingdom',label:'Kingdom', sortable: true,
        // formatter: (value, key, item) => {
        // return item.lineage['kingdom']}, sortByFormatted: true},
        // {key: 'family',label:'Family', sortable: true, formatter: (value, key, item) => {
        // return item.lineage['family']},sortByFormatted: true},],
    }
  },
  methods: {
    resetTaxName(){
      this.taxName = 'Eukaryota'
      this.$store.commit('portal/setTree',{value: 'Eukaryota'})
      this.$root.$emit('bv::refresh::table', this.tableId)
    },
    filterSearch(params,callback){
      portalService.getFilteredOrganisms(params).then(response => {
        this.totalRows = response.data.total
        const items = Object.freeze(response.data.data)
            callback(items)
        }).catch(() => {
        callback([])
        })
      return null
    },
    defaultSearch(params,callback){
      portalService.getOrganisms(params).then(response => {
          this.totalRows = response.data.total
          const items = Object.freeze(response.data.data)
          callback(items)
        }).catch(() => {
        callback([])
        })
      return null
    },
    organismsProvider(ctx,callback){
      console.log(ctx)
      const fromParam = (ctx.currentPage - 1) * ctx.perPage
      if(ctx.filter){
        const params = {filter: ctx.filter,from: fromParam, size: ctx.perPage,sortColumn: ctx.sortBy, sortOrder: ctx.sortDesc,taxName: this.taxName }
        this.filterSearch(params,callback)          
      }
      else {
        const params = {offset: fromParam , limit: ctx.perPage, sortColumn: ctx.sortBy, sortOrder: ctx.sortDesc,taxName: this.taxName}
        this.defaultSearch(params,callback)
      }
    },
  }
}
</script>
