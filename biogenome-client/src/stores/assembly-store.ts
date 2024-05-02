import { defineStore } from 'pinia'
import { models } from '../../config.json'


const parsedFilters = models.assemblies.filters as Record<string,any>[]

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

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useAssemblyStore = defineStore('assembly', {
  state: () => {
    return {
      searchForm: { ...initSearchForm },
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
  },
})
