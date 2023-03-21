import { defineStore } from 'pinia'
import AuthService from '../services/clients/AuthService'

export const useGlobalStore = defineStore('global', {
  state: () => {
    return {
      isSidebarMinimized: false,
      userName: '',
      userPassword: '',
      userRole: '',
      isAuthenticated: false,
      showLoginModal: false,
      error: false,
      message: '',
    }
  },
  actions: {
    toggleSidebar() {
      this.isSidebarMinimized = !this.isSidebarMinimized
    },

    changeUserName(userName: string) {
      this.userName = userName
    },
    async login() {
      try {
        const response = await AuthService.login({ name: this.userName, password: this.userPassword })
        if (response.status === 200) this.isAuthenticated = true
        console.log(response)
        // this.setLocalStorage()
      } catch (error) {
        console.log(error)
        this.isAuthenticated = false
      }
    },
    async logout() {
      // try {
      //     const response = await SubmissionService.logout()
      //     localStorage.clear()
      //     this.user.name = ''
      //     this.user.password = ''
      //     this.user.role = ''
      //     this.isAuthenticated = ''
      //     this.setLocalStorage()
      //     this.message.text = response.data.msg
      //     this.message.color = 'success'
      // }
      // catch (error) {
      //     this.message.text = error.response.data.message
      //     this.message.color = 'danger'
      // }
    },
    // setLocalStorage(){
    //   localStorage.setItem('userName', this.userName)
    //   localStorage.setItem('userRole', this.userRole)
    // }
  },
})
