<template>
    <b-container class="router-container" fluid>
      <tree-bread-crumb-component/>
      <filter-component :filter="filter" :placeholder="'Search in ' + taxName"/>
      <div ref="organismsTable">
      <table-component 
        :items="organismsProvider"
        :busy.sync="isBusy"
        :filter="filter"
        :fields="organismFields"
        :current-page="currentPage"
        :per-page="perPage"
        :primary-key="'id'"
        :custom-fields="customFields"
        :id="tableId"
        :sticky-header="stickyHeader"
        @row-selected="onRowSelected"
        :selectable="hasToken"
        :selectMode="'multi'"
        
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
        <template #head(actions)>
          <b-dropdown dropup class="mx-1" right text="Actions">
              <b-dropdown-item :disabled="selectedOrganisms.lenght === 0" @click="deleteOrganisms(selectedOrganisms)" variant="danger">Delete selected organisms</b-dropdown-item>
          </b-dropdown>         
        </template>
        <template #head(data)>
          <b-badge variant="warning">Reads</b-badge>
          <b-badge variant="primary">Assemblies</b-badge>
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
            <b-badge class="link-badge" pill variant='dark' target="_blank" :href="'https://goat.genomehubs.org/records?record_id='+data.item.taxid+'&result=taxon&taxonomy=ncbi#'+data.item.organism">GoaT</b-badge>
            <b-badge class="link-badge" variant="info" pill target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.item.taxid">ENA</b-badge>
            <b-badge class="link-badge" pill target="_blank" :href="'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='+data.item.taxid">NCBI</b-badge>
        </template>
        <template #cell(actions)="data">
            <b-link class="actions-link" @click="editOrganism(data['item'])">
                <b-icon-pen-fill variant="primary"></b-icon-pen-fill>
            </b-link>
            <b-link @click="deleteOrganisms([data['item']])">
                <b-icon-trash-fill variant="danger"></b-icon-trash-fill>
            </b-link>
        </template>
        <template #cell(data)="data">
            <b-badge style="cursor:pointer" v-if="data['item'].experiments.length" @click.stop="getData(data['item'], 'experiments')" pill variant="warning">{{data['item'].experiments.length}}</b-badge>
            <b-badge style="cursor:pointer" v-if="data['item'].assemblies.length" @click.stop="getData(data['item'], 'assemblies')" pill variant="primary">{{data['item'].assemblies.length}}</b-badge>
        </template>
      </table-component>
      </div>
      <data-modal :data="data" :model="model" :organism="organism"/>
      <edit-organism-modal :organism="organism" :commonNames="commonNames"/>
      <pagination-component :per-page="perPage" :page-options="pageOptions" :total-rows="totalRows" :current-page="currentPage" :table-id="tableId"/>
    </b-container>
</template>

<script>
import portalService from "../../services/DataPortalService"
import {BBadge, BIconPenFill,BIconTrashFill, BLink, BFormSelect, BDropdown, BDropdownItem } from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue';
import FilterComponent from '../base/FilterComponent.vue';
import PaginationComponent from '../base/PaginationComponent.vue';
import {mapFields, showConfirmationModal} from '../../utils/helper'
import StatusBadgeComponent from '../base/StatusBadgeComponent.vue';
import SubmissionService from '../../services/SubmissionService';
import DataModal from '../modal/DataModal.vue';
import TreeBreadCrumbComponent from '../taxon/TreeBreadCrumbComponent.vue';
import EditOrganismModal from '../modal/EditOrganismModal.vue';

export default {
  components: 
    {
      BLink,BBadge, BFormSelect,TableComponent,PaginationComponent,FilterComponent,
      StatusBadgeComponent,BDropdown, BDropdownItem,BIconPenFill,BIconTrashFill,
      DataModal,TreeBreadCrumbComponent,EditOrganismModal
    },
  computed: {
    ...mapFields({
      fields: ['filter','perPage', 'taxName','totalRows','currentPage'],
      module: 'portal',
      mutation: 'portal/setField'      
    }),
    hasToken(){
      return localStorage.getItem('token')
    },
    organismFields(){
      if(this.hasToken){
          return this.fields.concat([{key:'actions',label:'Actions'}])
      }
      return this.fields
    },
  },
  data() {
    return {
      tableId:'organisms-table',
      pageOptions: [20,50,100],
      props:['isAdmin'],
      isBusy: false,
      stickyHeader: '70vh',
      selectedStatus: '',
      statuses: [
        { value: '', text: 'All' },
        { value: 'Sample Acquired', text: 'Sample Acquired'},
        { value: 'Biosample Submitted', text: 'Biosamples Submitted'},
        { value: 'Reads Submitted', text: 'Reads Submitted' },
        { value: 'Assemblies Submitted', text: 'Assemblies Submitted' },
        { value: 'Annotation Complete', text: 'Annotation Complete' },
        { value: 'Annotation Submitted', text: 'Annotation Submitted' }
      ],
      fields: [
        {key: 'taxid', label: 'TaxId',sortable: true},
        {key: 'organism',label:'Name',sortable: true},
        {key:'common_name', label: 'Common Name', sortable: true},
        {key: 'trackingSystem', label:'Status', sortalble: false},
        {key: 'data'},
        {key: 'externalReferences', label:'Links'},
      ],
      selectedOrganisms:[],
      data:[],
      organism:null,
      commonNames: '',
      model:'',
    }
  },
  watch: {
    selectedStatus(){
      this.$root.$emit('bv::refresh::table', this.tableId)
    }
  },
  methods: {
    deleteOrganisms(organisms){
      const message = 'This will permanently delete the organism and its related data. Are you sure?'
      showConfirmationModal(this.$bvModal, message)
      .then(value => {
        if(value){
          const taxids = organisms.map(organism => {return organism.taxid}).join()
          return SubmissionService.deleteOrganisms({tax_ids:taxids})
        }
        return null
      })
      .then(response=>{
        if(response){
          this.$store.commit('submission/setAlert',{variant:'success', message: 'organisms correctly deleted: ' + response.data.join()})
          this.$store.dispatch('submission/showAlert')
          this.$router.go()
          }
      })
      .catch(e=>{
          this.$store.commit('submission/setAlert',{variant:'danger', message: e})
          this.$store.dispatch('submission/showAlert')
      })
    },
    editOrganism(organism){
      this.organism = organism
      this.commonNames = organism.common_name.join()
      this.$bvModal.show('organism-modal')
    },
    getData(organism, model){
      this.$store.dispatch('portal/showLoading')
      const ids = organism[model].map(dt => {return dt.$oid})
      portalService.getData(model,{ids:ids})
      .then(response => {
        this.data = response.data
        this.model = model
        this.organism = organism.organism
        this.$bvModal.show('data-modal')
        this.$store.dispatch('portal/hideLoading')
      })
    },
    onRowSelected(value){
      this.selectedOrganisms = value
    },
    filterSearch(params,callback){
      portalService.getFilteredOrganisms(params).then(response => {
        this.totalRows = response.data.total
        const items = Object.freeze(response.data.data)
        callback(items)
        })
        .catch(() => {
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
<style>
.link-badge{
  margin-right:5px
}
</style>