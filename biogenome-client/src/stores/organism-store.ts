import { defineStore } from 'pinia'
import { Publication, CommonName, Metatada, OrganismForm } from '../data/types'


const initOrganismForm: OrganismForm = {
  taxid: null,
  scientific_name: null,
  common_names: [] as CommonName[],
  image: '',
  image_urls: [] as string[],
  metadata: {} as Record<string, string>,
  publications: [] as Publication[],
  sub_project: null,
  goat_status: '',
  target_list_status: null,
}

export const useOrganismStore = defineStore('organism', {
  state: () => {
    return {
      organismForm: { ...initOrganismForm },
      metadataList: [] as Metatada[],
      publications: [] as Publication[],
      vernacularNames: [] as CommonName[],
      images: [] as Record<'value', string>[],
      isValid: false,
      filter: ''
    }
  },

  actions: {
    resetOrganimForm() {
      this.organismForm = { ...initOrganismForm }
    },
  },
})
