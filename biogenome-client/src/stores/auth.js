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
            color:'secondary',
            text:'Here you will see the last notification'
        }
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
                const response = await SubmissionService.login(this.user)
                this.message.text = response.data.msg
                this.user.role = response.data.role
                this.message.color = 'success'
                this.isAuthenticated = true
                this.setLocalStorage()
                router.go(-1)
              } catch (error) {
                this.message.text = error.response.data.message
                this.message.color = 'danger'
                // let the form component display the error
                return error
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
              } catch (error) {
                this.message.text = error.response.data.message
                this.message.color = 'danger'
                // let the form component display the error
                return error
              }
        },
        setLocalStorage(){
          localStorage.setItem('userName', this.user.name)
          localStorage.setItem('userRole', this.user.role)
          localStorage.setItem('isAuthenticated', this.isAuthenticated)
        }

    }
  })