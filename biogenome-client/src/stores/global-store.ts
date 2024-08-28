import { defineStore } from 'pinia'
import AuthService from '../services/clients/AuthService'

export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      userName: '',
      userPassword: '',
      userRole: '',
      userSpecies: [] as string[],
      isAuthenticated: false,
      showLoginModal: false,
      error: false,
      message: '',

    }
  },
  actions: {

    changeUserName(userName: string) {
      this.userName = userName
    },
    async login() {
      try {
        const response = await AuthService.login({ name: this.userName, password: this.userPassword })
        if (response.status === 200) this.isAuthenticated = true
        // this.setLocalStorage()
      } catch (error) {
        console.log(error)
        this.isAuthenticated = false
      }
    },
    async logout() {
      await AuthService.logout()
      this.userName = ''
      this.userPassword = ''
      this.userRole = ''
      this.isAuthenticated = false
    },
  },
})
