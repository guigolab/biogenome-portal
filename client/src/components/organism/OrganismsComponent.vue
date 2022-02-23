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
        <template #head(trackingSystem)>
          <b-form-select
            id="status-select"
            v-model="selectedStatus"
            :options="statuses"
            size="sm"
          >
          </b-form-select>
        </template>
        <template v-if="hasToken" #head(actions)>
          <b-dropdown dropup class="mx-1" right text="Actions">
              <b-dropdown-item @click="deleteOrganisms(samples)" variant="danger">Delete selected organisms</b-dropdown-item>
              <b-dropdown-item @click="downloadExcel()">Download samples of selected Organisms</b-dropdown-item>
          </b-dropdown>         
        </template>
        <template #cell(organism)="data">
          <b-link :to="{name: 'organism-details', params: {name: data.item.organism}}">
            {{data.item.organism}}
          </b-link>
        </template>
          <template #cell(common_name)="data">
            {{data.item.common_name.toString()}}
        </template>
        <template #cell(trackingSystem)="data">
          <status-badge-component :status="data.item.trackingSystem"/>
        </template>
         <template #cell(externalReferences)="data">
            <b-badge pill variant='info' target="_blank" :href="'https://goat.genomehubs.org/records?record_id='+data.item.taxid+'&result=taxon&taxonomy=ncbi#'+data.item.organism">GoaT</b-badge>
        </template>
        <template #cell(actions)="data">
            <b-link class="actions-link" @click="editOrganism(data['item'])">
                <b-icon-pen-fill variant="primary"></b-icon-pen-fill>
            </b-link>
            <b-link @click="deleteOrganisms([data['item']])">
                <b-icon-trash-fill variant="danger"></b-icon-trash-fill>
            </b-link>
        </template>
      </table-component>
      <pagination-component :per-page="perPage" :page-options="pageOptions" :total-rows="totalRows" :current-page="currentPage" :table-id="tableId"/>
    </b-container>
</template>

<script>
import portalService from "../../services/DataPortalService"
import { BIconXCircle, BBadge, BIconPenFill,BIconTrashFill, BButton, BLink, BFormSelect, BDropdown, BDropdownItem } from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue';
import FilterComponent from '../base/FilterComponent.vue';
import PaginationComponent from '../base/PaginationComponent.vue';
import {mapFields} from '../../utils/helper'
import StatusBadgeComponent from '../base/StatusBadgeComponent.vue';

export default {
  components: 
    {BLink, BIconXCircle, BBadge,
     BButton, BFormSelect,TableComponent,PaginationComponent,
      FilterComponent,
      StatusBadgeComponent,BDropdown, BDropdownItem,BIconPenFill,BIconTrashFill, },
  computed: {
    ...mapFields({
      fields: ['filter','taxName','perPage', 'totalRows','currentPage'],
      module: 'portal',
      mutation: 'portal/setField'      
    }),
    hasToken(){
      return localStorage.getItem('token')
    }
  },
  data() {
    return {
      tableId:'organisms-table',
      pageOptions: [20,50,100],
      isBusy: false,
      stickyHeader: '70vh',
      selectedStatus: '',
      statuses: [
        { value: '', text: 'All' },
        { value: 'Biosample Submitted', text: 'Biosample Submitted'},
        { value: 'Mapped Reads Submitted', text: 'Mapped Reads Submitted' },
        { value: 'Assemblies Submitted', text: 'Assemblies Submitted' },
        { value: 'Raw Data Submitted', text: 'Raw Data Submitted' },
        { value: 'Annotation Complete', text: 'Annotation Complete' },
        { value: 'Annotation Submitted', text: 'Annotation Submitted' }
      ],
      fields: [
        {key: 'taxid', label: 'TaxId',sortable: true},
        {key: 'organism',label:'Scientific Name',sortable: true},
        {key:'common_name', label: 'Common Names', sortable: true},
        {key: 'trackingSystem', label:'Status', sortalble: false},
        {key: 'externalReferences', label:'External References'},
        {key: 'actions'}
      ]
    }
  },
  watch: {
    selectedStatus(){
      this.$root.$emit('bv::refresh::table', this.tableId)
    }
  },
  methods: {
    // deleteOrganisms(samples){

    // },
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
      const fromParam = (ctx.currentPage - 1) * ctx.perPage
      const status = this.selectedStatus
      if(ctx.filter){
        const params = {filter: ctx.filter,from: fromParam, size: ctx.perPage,sortColumn: ctx.sortBy, sortOrder: ctx.sortDesc,taxName: this.taxName, status: status }
        this.filterSearch(params,callback)          
      }
      else {
        const params = {offset: fromParam , limit: ctx.perPage, sortColumn: ctx.sortBy, sortOrder: ctx.sortDesc,taxName: this.taxName, status: status}
        this.defaultSearch(params,callback)
      }
    },
  }
}
</script>
