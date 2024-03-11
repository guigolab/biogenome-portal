import { defineStore } from 'pinia'
import {  Publication, CommonName,Metatada,OrganismForm } from '../data/types'
import { OrganismSearchForm } from '../data/types'

const initSearchForm: OrganismSearchForm = {
  insdc_status: '',
  goat_status: '',
  parent_taxid: '',
  target_list_status: '',
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',
  country: '',
}
const initOrganismForm:OrganismForm = {
  taxid: null,
  scientific_name: null,
  common_names: [] as CommonName[],
  image: '',
  image_urls: [] as string[],
  metadata: {} as Record<string, string>,
  publications: [] as Publication[],
  goat_status: '',
  target_list_status: '',
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useOrganismStore = defineStore('organism', {
  state: () => {
    return {
      searchForm: { ...initSearchForm },
      organismForm: { ...initOrganismForm },
      pagination: { ...initPagination },
      metadataList: [] as Metatada[],
      publications: [] as Publication[],
      vernacularNames: [] as CommonName[],
      images: [] as Record<'value',string>[]
    }
  },

  actions: {
    resetSearchForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
    resetOrganimForm() {
      this.organismForm = { ...initOrganismForm }
    },
  },
})
