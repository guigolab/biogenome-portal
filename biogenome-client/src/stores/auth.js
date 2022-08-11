import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'
import SubmissionService from '../services/SubmissionService'
import router from '../router'
export const auth = defineStore('auth', {
    state: () => ({
        user: {
            name: localStorage.getItem('userName') || "",
            password:'',
            role: localStorage.getItem('userRole') || "",
        },
        isAuthenticated: localStorage.getItem('isAuthenticated') || "",
        message: {
            color:'',
            text:'',
            title:''
        },
        isLoading:false,
        showModal:false
    }),
    actions: {
        removeUser(){
          this.user.name = ""
          this.user.role = ""
          this.isAuthenticated = ""
          this.setLocalStorage()

        },
        async login(){
          try {
              this.isLoading = true
              const response = await SubmissionService.login(this.user)
              this.message.text = response.data.msg
              this.user.role = response.data.role
              this.message.color = 'success'
              this.message.title = `Welcome ${this.user.name}`
              this.isAuthenticated = true
              this.setLocalStorage()
              this.isLoading=false
              this.showModal=false
              // router.go(-1)
          } 
          catch (error) {
            console.log(error.response.data.msg)
              this.message.text = error.response.data.msg
              this.message.color = 'danger'
              this.message.title = 'Error'
              this.isLoading = false
          }
        },
        async logout(){
          try {
              const response = await SubmissionService.logout()
              localStorage.clear()
              this.user.name = ''
              this.user.password = ''
              this.user.role = ''
              this.isAuthenticated = ''
              this.setLocalStorage()
              this.message.text = response.data.msg
              this.message.color = 'success'
          } 
          catch (error) {
              this.message.text = error.response.data.message
              this.message.color = 'danger'
          }
        },
        setLocalStorage(){
          localStorage.setItem('userName', this.user.name)
          localStorage.setItem('userRole', this.user.role)
          localStorage.setItem('isAuthenticated', this.isAuthenticated)
        }

    }
  })