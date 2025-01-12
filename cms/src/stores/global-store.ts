import { defineStore } from 'pinia'
import { useToast } from 'vuestic-ui'
import AuthService from '../services/AuthService'

const AUTH_KEY = 'auth'
const isAuth = localStorage.getItem(AUTH_KEY) === 'true'

export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      userName: '',
      userRole: '',
      userSpecies: [] as string[],
      isAuthenticated: isAuth,
      error: false,
      message: '',
      toast: useToast().init
    }
  },
  actions: {

    mapUser(data: Record<string, any>) {
      this.userName = data.name
      this.userRole = data.role
      if (this.userRole !== 'Admin') this.userSpecies = data.species
      localStorage.setItem(AUTH_KEY, 'true');
      this.isAuthenticated = true
    },

    async login(username: string, password: string) {
      try {
        const { data } = await AuthService.login({ username, password })
        this.mapUser(data)
        this.toast({ message: `Welcome ${this.userName}!`, color: 'success' })
      } catch (error) {
        console.log(error)
        this.toast({ message: 'Bad user or password', color: 'danger' })
        this.isAuthenticated = false
        localStorage.setItem(AUTH_KEY, 'false');
      }
    },

    async checkUserIsLoggedIn() {
      if (!this.isAuthenticated) return
      try {
        const { data } = await AuthService.check()
        this.mapUser(data)
      } catch (error) {
        console.error(error)
        localStorage.setItem(AUTH_KEY, 'false');
      }
    },

    async logout() {
      await AuthService.logout()
      this.userName = ''
      this.userRole = ''
      this.userSpecies = []
      localStorage.setItem(AUTH_KEY, 'false');
      this.isAuthenticated = false
    },
  },
})
