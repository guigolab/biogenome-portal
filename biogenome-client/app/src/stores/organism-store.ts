import { defineStore } from 'pinia'
import { Publication, CommonName, Metatada, OrganismForm, Filter } from '../data/types'


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
      organismForm: { ...initOrganismForm },
      metadataList: [] as Metatada[],
      publications: [] as Publication[],
      vernacularNames: [] as CommonName[],
      images: [] as Record<'value', string>[]
    }
  },

  actions: {
    resetOrganimForm() {
      this.organismForm = { ...initOrganismForm }
    },
  },
})
