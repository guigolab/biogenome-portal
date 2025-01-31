import { defineStore } from 'pinia'
import { useToast } from 'vuestic-ui'

const AUTH_KEY = 'auth'
const isAuth = localStorage.getItem(AUTH_KEY) === 'true'

export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      error: false,
      fluid:false,
      message: '',
      toast: useToast().init
    }
  }
})
