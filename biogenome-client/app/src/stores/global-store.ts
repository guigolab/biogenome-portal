import { defineStore } from 'pinia'


export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      error: false,
      message: '',
    }
  }
})
