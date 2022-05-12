<template>
<b-row>
  <b-col>
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
        <template #thead-top>
            <b-tr>
              <b-th class="extra-th" colspan="4">Taxonomic Informations</b-th>
              <b-th class="extra-th my-left-border" colspan="4">INSDC Submission Status</b-th>
            </b-tr>
        </template>
        <template #head(local_samples)>
            <b-form-checkbox
              v-model="showLocalSamples"
              name="local_samples-checkbox"
            >
            Loc.Samples
            </b-form-checkbox>
        </template>
        <template #head(insdc_samples)>
            <b-form-checkbox
              v-model="showBiosamples"
              name="insdc-samples-checkbox"
            >
              BioSamples
            </b-form-checkbox>
        </template>
        <template #head(assemblies)>
            <b-form-checkbox
              v-model="showAssemblies"
              name="ass-checkbox"
            >
              Assemblies
            </b-form-checkbox>
        </template>
        <template #head(experiments)>
            <b-form-checkbox
              v-model="showReads"
              name="exp-checkbox"
            >
              Experiments
            </b-form-checkbox>
        </template>
        <template #head(actions)>
          <b-dropdown dropup class="mx-1" right text="Actions">
              <b-dropdown-item :disabled="selectedOrganisms.lenght === 0" @click="deleteOrganisms(selectedOrganisms)" variant="danger">Delete selected organisms</b-dropdown-item>
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
        <template #cell(local_samples)="data">
          <div class="badge-wrapper">
            <b-badge href="#" style="cursor:pointer" v-if="data['item'].local_samples.length" @click.stop="getData(data['item'], 'local_samples')" pill variant="info">{{data['item'].local_samples.length}}</b-badge>
          </div>
        </template>
        <template #cell(insdc_samples)="data">
          <div class="badge-wrapper">
            <b-badge href="#" pill style="cursor:pointer" v-if="data['item'].insdc_samples.length" @click.stop="getData(data['item'], 'insdc_samples')"  variant="success">{{data['item'].insdc_samples.length}}</b-badge>
          </div>
        </template>
        <template #cell(assemblies)="data">
          <div class="badge-wrapper">
            <b-badge href="#" pill style="cursor:pointer" v-if="data['item'].assemblies.length" @click.stop="getData(data['item'], 'assemblies')"  variant="primary">{{data['item'].assemblies.length}}</b-badge>
          </div>
        </template>outline-success
        <template #cell(experiments)="data">
          <div class="badge-wrapper">
            <b-badge href="#" v-if="data['item'].experiments.length" @click.stop="getData(data['item'], 'experiments')" pill variant="warning">{{data['item'].experiments.length}}</b-badge>
          </div>
        </template>
         <template #cell(externalReferences)="data">
            <b-badge pill variant="dark" target="_blank" :href="'https://goat.genomehubs.org/records?record_id='+data.item.taxid+'&result=taxon&taxonomy=ncbi#'+data.item.organism">GoaT</b-badge>
            <b-badge pill variant="info" target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.item.taxid">ENA</b-badge>
            <b-badge pill variant="secondary" target="_blank" :href="'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='+data.item.taxid">NCBI</b-badge>
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
      <data-modal :data="data" :model="model" :organism="organism"/>
      <edit-organism-modal :organism="organism" :commonNames="commonNames"/>
      <pagination-component :per-page="perPage" :page-options="pageOptions" :total-rows="totalRows" :current-page="currentPage" :table-id="tableId"/>
      </b-col>
    </b-row>
</template>

<script>
import portalService from "../../services/DataPortalService"
import {BTr,BBadge,BTh,BFormCheckbox, BIconPenFill,BIconTrashFill, BLink, BDropdown, BDropdownItem } from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue';
import PaginationComponent from '../base/PaginationComponent.vue';
import {mapFields, showConfirmationModal} from '../../utils/helper'
import SubmissionService from '../../services/SubmissionService';
import DataModal from '../modal/DataModal.vue';
import EditOrganismModal from '../modal/EditOrganismModal.vue';

export default {
  components: 
    {
      BLink,BBadge,TableComponent,PaginationComponent,
      BDropdown, BDropdownItem,BIconPenFill,BIconTrashFill,
      DataModal,EditOrganismModal,BTr,BTh,BFormCheckbox
    },
  computed: {
    ...mapFields({
      fields: ['filter','perPage', 'option','taxName','totalRows','currentPage'],
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
      showBiosamples:false,
      showLocalSamples:false,
      showAssemblies:false,
      showReads:false,
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
        {key: 'tolid_prefix', label: 'ToLID'},
        {key: 'organism',label:'Name',sortable: true,stickyColumn: true},
        {key:'insdc_common_name', label: 'Common Name', sortable: true},
        // {key: 'annotations', label: 'Annotations'},
        {key: 'externalReferences', label:'Links'},
        {key: 'local_samples', label: 'Acquired Samples', class:'my-left-border'},
        {key: 'insdc_samples', label: 'BioSamples'},
        {key: 'experiments', label: 'Reads'},
        {key: 'assemblies', label: 'Assemblies'},
        // {key: 'trackingSystem', label:'INSDC Status', sortable: false},

      ],
      selectedOrganisms:[],
      data:[],
      organism:null,
      commonNames: '',
      model:'',
    }
  },
  watch: {
    showBiosamples(){
      this.$root.$emit('bv::refresh::table', this.tableId)
    },
    showLocalSamples(){
      this.$root.$emit('bv::refresh::table', this.tableId)
    },
    showAssemblies(){
      this.$root.$emit('bv::refresh::table', this.tableId)
    },
    showReads(){
      this.$root.$emit('bv::refresh::table', this.tableId)
    },
    option(){
      this.filter=''
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
    defaultSearch(params, callback){
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
      const params = {
        filter: ctx.filter,
        offset: fromParam,
        limit: ctx.perPage,
        sortColumn: ctx.sortBy,
        sortOrder: ctx.sortDesc,
        taxName: this.taxName,
        insdc_samples: this.showBiosamples,
        local_samples: this.showLocalSamples,
        assemblies: this.showAssemblies,
        experiments: this.showReads,
        option: this.option
        }
      this.defaultSearch(params,callback)
    }
  }
}
</script>
<style>

.link-badge{
  margin-right:5px
}
.badge-wrapper, .extra-th{
  text-align: center;
}
.b-table .my-left-border {
  border-left: 1px solid #e9ecef;
}
.th-text-color{
  color: black !important
}
.organism-data-table{
  border-radius: 1.25rem;
}
</style>