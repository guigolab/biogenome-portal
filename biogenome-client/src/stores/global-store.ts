import { defineStore } from 'pinia'
import { useToast } from 'vuestic-ui'
import AuthService from '../services/AuthService'

const AUTH_KEY = 'auth'
const LANG = 'lang'
const isAuth = localStorage.getItem(AUTH_KEY) === 'true'

const lang = localStorage.getItem(LANG)
export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      userName: '',
      userRole: '',
      userSpecies: [] as string[],
      isAuthenticated: isAuth,
      adminSidebar: false,
      language: lang,
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
      this.setAuth(true)
    },
    changeLang(lang: string) {
      this.language = lang
      localStorage.setItem(LANG, lang)
    },
    async login(name: string, password: string) {
      try {
        const { data } = await AuthService.login({ name, password })
        this.mapUser(data)
        this.toast({ message: `Welcome ${this.userName}!`, color: 'success' })
      } catch (error) {
        console.log(error)
        this.toast({ message: 'Bad user or password', color: 'danger' })
        this.setAuth(false)
      }
    },

    async checkUserIsLoggedIn() {
      if (!this.isAuthenticated) return false
      try {
        const { data } = await AuthService.check()
        this.mapUser(data)
        return true
      } catch (error: any) {
        console.error('Authentication check failed:', error)
        
        // If it's a 401 error, clear auth state
        if (error.response && error.response.status === 401) {
          this.clearAuthState()
        }
        
        this.setAuth(false)
        return false
      }
    },

    clearAuthState() {
      this.userName = ''
      this.userRole = ''
      this.userSpecies = []
      this.setAuth(false)
    },

    setAuth(value: boolean) {
      this.isAuthenticated = value
      const stringfiedValue = value ? 'true' : 'false'
      localStorage.setItem(AUTH_KEY, stringfiedValue)
    },
    async logout() {
      try {
        await AuthService.logout()
      } catch (error) {
        console.error('Logout error:', error)
        // Continue with logout even if server call fails
      } finally {
        this.clearAuthState()
      }
    },
  },
})
