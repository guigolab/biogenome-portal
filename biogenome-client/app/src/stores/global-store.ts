import { defineStore } from 'pinia'
import { useToast } from 'vuestic-ui'


export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      error: false,
      message: '',
      toast: useToast().init
    }
  }
})
