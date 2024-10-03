import { defineStore } from 'pinia'
import AuthService from '../services/clients/AuthService'
import { useToast } from 'vuestic-ui'

export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarVisible: true,
      userName: '',
      userRole: '',
      userSpecies: [] as string[],
      isAuthenticated: false,
      error: false,
      message: '',
      toast: useToast().init
    }
  },
  actions: {
    mapUser(data:Record<string,any>){
      this.userName = data.name
      this.userRole = data.role 
      if(this.userRole !== 'Admin') this.userSpecies = data.species 
      this.isAuthenticated = true
    },
    async login(name: string, password:string) {
      try {
        const {data} = await AuthService.login({ name, password})
        this.mapUser(data)
        this.toast({message: `Welcome ${this.userName}!`, color:'success'})
      } catch (error) {
        console.log(error)
        this.toast({ message: 'Bad user or password', color: 'danger' })
        this.isAuthenticated = false
      }
    },
    async checkUserIsLoggedIn() {
      try {
        const { data } = await AuthService.check()
        this.mapUser(data)
      } catch (error) {
        console.error(error)
        this.isAuthenticated = false
      }
    },
    async logout() {
      await AuthService.logout()
      this.userName = ''
      this.userRole = ''
      this.userSpecies = []
      this.isAuthenticated = false
    },
  },
})
