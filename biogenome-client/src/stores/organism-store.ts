import { defineStore } from 'pinia'
import { Contributor, BreadCrumb, Publication, CommonName } from '../data/types'
import { OrganismSearchForm } from '../data/types'

const initSearchForm: OrganismSearchForm = {
  insdc_status: '',
  goat_status: '',
  parent_taxid: '',
  bioproject: '',
  target_list_status: '',
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',
  country: '',
}
const initOrganismForm = {
  taxid: null,
  scientific_name: null,
  common_names: [] as CommonName[],
  image: '',
  image_urls: [] as string[],
  metadata: {} as Record<string, string>,
  publications: [] as Publication[],
  goat_status: null,
  target_list_status: null,
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useOrganismStore = defineStore('organism', {
  state: () => {
    return {
      gals: [] as Contributor[],
      breadcrumbs: [] as BreadCrumb[],
      searchForm: { ...initSearchForm },
      organismForm: { ...initOrganismForm },
      pagination: { ...initPagination },
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
