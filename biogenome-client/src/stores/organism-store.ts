import { defineStore } from 'pinia'
import { Publication, CommonName, Metatada, OrganismForm, Filter } from '../data/types'
import { models } from '../../config.json'
const parsedFilters = models.organisms ? models.organisms.filters as Filter[] : []

const formEntries = parsedFilters.map(f => {
  if (f.type === "date") {
    return [[`${f.key}__gte`, ""], [`${f.key}__lte`, ""]]
  }
  return [[f.key, f.type === 'checkbox' ? false : ""]]
}).flat()

const initSearchForm = {
  filter: "",
  sort_order: "",
  sort_column: "",
  ...Object.fromEntries(formEntries)
}


const initOrganismForm: OrganismForm = {
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
      images: [] as Record<'value', string>[]
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
