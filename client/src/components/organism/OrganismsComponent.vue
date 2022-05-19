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
        <template #head(actions)>
          <b-dropdown dropup class="mx-1" right text="Actions">
              <b-dropdown-item :disabled="selectedOrganisms.lenght === 0" @click="deleteOrganisms(selectedOrganisms)" variant="danger">Delete selected organisms</b-dropdown-item>
          </b-dropdown>         
        </template>
        <template #cell(bioprojects)="data">
          <b-link target="_blank" v-for="bioproject in data.item.bioprojects" :key="bioproject" :href="'https://www.ebi.ac.uk/ena/browser/view/'+bioproject">
            {{bioproject}}
          </b-link>
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
        </template>
        <template #cell(annotations)="data">
          <div class="badge-wrapper">
            <b-badge href="#" pill style="cursor:pointer" v-if="data['item'].annotations.length" @click.stop="getData(data['item'], 'annotations')"  variant="secondary">{{data['item'].annotations.length}}</b-badge>
          </div>
        </template>
        <template #cell(experiments)="data">
          <div class="badge-wrapper">
            <b-badge href="#" v-if="data['item'].experiments.length" @click.stop="getData(data['item'], 'experiments')" pill variant="warning">{{data['item'].experiments.length}}</b-badge>
          </div>
        </template>
         <template #cell(externalReferences)="data">
            <b-badge pill variant="light" target="_blank" :href="'https://goat.genomehubs.org/records?record_id='+data.item.taxid+'&result=taxon&taxonomy=ncbi#'+data.item.organism">GoaT</b-badge>
            <b-badge pill variant="light" target="_blank" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.item.taxid">ENA</b-badge>
            <b-badge pill variant="light" target="_blank" :href="'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='+data.item.taxid">NCBI</b-badge>
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
      <pagination-component :pageOptions="[20,50,100]"/>
      <data-modal :data="data" :model="model" :organism="organism"/>
      <edit-organism-modal :organism="organism" :commonNames="commonNames"/>
      </b-col>
    </b-row>
</template>

<script>
import portalService from "../../services/DataPortalService"
import {BBadge, BIconPenFill,BIconTrashFill, BLink, BDropdown, BDropdownItem } from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue';
import {mapFields, showConfirmationModal} from '../../utils/helper'
import SubmissionService from '../../services/SubmissionService';
import DataModal from '../modal/DataModal.vue';
import EditOrganismModal from '../modal/EditOrganismModal.vue';
import PaginationComponent from '../base/PaginationComponent.vue';
import {dataOptions} from '../../utils/static-config'

export default {
  components: 
    {
      BLink,BBadge,TableComponent,
      BDropdown, BDropdownItem,BIconPenFill,BIconTrashFill,
      DataModal,EditOrganismModal,
        PaginationComponent
    },
  computed: {
    ...mapFields({
      fields: ['filter','perPage',
       'onlySelectedData','selectedBioproject',
       'option','taxName',
       'totalRows','currentPage','selectedData'],
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
      fields: [
        {key: 'tolid_prefix', label: 'ToLID Prefix'},
        {key: 'organism',label:'Scientific Name',sortable: true,stickyColumn: true},
        {key:'insdc_common_name', label: 'Common Name', sortable: true},
        {key:'bioprojects', label: 'Bioprojects'},
        {key: 'externalReferences', label:'External Links'},
        // {key: 'local_samples', label: 'Acquired Samples', class:'my-left-border'},
        {key: 'insdc_samples', label: 'Submitted BioSamples',class:'my-left-border'},
        {key: 'experiments', label: 'Submitted Reads'},
        {key: 'assemblies', label: 'Submitted Assemblies'},
        {key: 'annotations', label: 'Annotations'}

      ],
      selectedOrganisms:[],
      data:[],
      organism:null,
      commonNames: '',
      model:'',
      dataOptions: dataOptions
    }
  },
  watch: {
     selectedData(values){
        this.dataOptions.forEach(opt => {
          if (values.includes(opt.value)){
            this.fields.filter(f => f.key === opt.value).forEach(f => f.variant = opt.variant)
          }else{
              this.fields.filter(f => f.key === opt.value).forEach(f => f.variant = "")
          }
        })
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
      const selectedData = this.dataOptions.map(opt => {
        var data = {}
        if (this.selectedData.includes(opt.value)){
          data[opt.value] = true
        }else{
          data[opt.value] = false
        }
        return data
      })
      const params = {
        filter: ctx.filter,
        offset: fromParam,
        limit: ctx.perPage,
        sortColumn: ctx.sortBy,
        sortOrder: ctx.sortDesc,
        taxName: this.taxName,
        option: this.option,
        onlySelectedData: this.onlySelectedData,
        bioproject:this.selectedBioproject,
        ...Object.assign({}, ...selectedData)
        }
      this.defaultSearch(params,callback)
    }
  }
}
</script>
<style>
.indsc-action-wrapper{
  float: right;
}
.link-badge{
  margin-right:5px
}
.badge-wrapper{
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