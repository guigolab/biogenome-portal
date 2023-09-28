import { defineStore } from 'pinia'

const initSearchForm = {
  insdc_status: '',
  goat_status: '',
  parent_taxid: '',
  target_list_status: '',
  filter: '',
  filter_option: '',
  country: '',
}



export const useLocationStore = defineStore('location', {
  state: () => {
    return {
      searchForm: { ...initSearchForm },
    }
  },

  actions: {
    resetSearchForm() {
      this.searchForm = { ...initSearchForm }
    }
  },
})
