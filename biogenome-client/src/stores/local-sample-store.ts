import { defineStore } from 'pinia'
import { LocalSampleSearchForm } from '../data/types'
const initLocalSampleForm = {
  local_id: '',
  taxid: '',
  scientific_name: '',
  metadata: {} as Record<string, string>,
}
const initPagination = {
  offset: 0,
  limit: 10,
}
const initSearchForm: LocalSampleSearchForm = {
  start_date: '',
  end_date: '',
  filter: '',
  sort_column: '',
  sort_order: '',
}
export const useLocalSampleStore = defineStore('local-sample', {
  state: () => {
    return {
      localSampleForm: { ...initLocalSampleForm },
      pagination: { ...initPagination },
      searchForm: { ...initSearchForm }
    }
  },
  actions: {
    resetSearchForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
  },
})
