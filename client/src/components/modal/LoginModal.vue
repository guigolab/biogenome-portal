<template>
    <b-modal
      id="login-modal"
      ref="modal"
      title="Login"
      no-close-on-backdrop
      ok-only
      @ok="handleOk"
      hide-header-close
      v-model="showModal"
      :body-text-variant="isTokenExpired? 'danger':'dark'"
    >
    <p v-if="isTokenExpired">Token has Expired</p>
      <b-form ref="form" @submit.stop.prevent="handleSubmit">
        <b-form-group
          label="User"
          label-for="name-input"
          invalid-feedback="User is required"
          :state="Boolean(user)"
        >
          <b-form-input
            id="name-input"
            v-model="user"
            :state="Boolean(user)"
            required
          ></b-form-input>
        </b-form-group>
          <b-form-group
          label="Password"
          invalid-feedback="A password is required"
          label-for="password-input"
          :state="password"
        >
          <b-form-input
            id="password-input"
            v-model="password"
            :state="Boolean(password)"
            type="password"
            required
          ></b-form-input>
        </b-form-group>
      </b-form>
</b-modal>
</template>
<script>
import {BForm,BFormGroup,BFormInput} from 'bootstrap-vue'
import submissionService from '../../services/SubmissionService'
import {mapFields} from '../../utils/helper'

export default {
    data(){
        return {
            formState: null,
            password: '',
        }
    },
    components: {
        BForm,BFormGroup,BFormInput
    },
    computed: {
        ...mapFields({
            fields: ['user','token'],
            module: 'submission',
            mutation: 'submission/setField'      
        }),
        showModal(){
            return this.$store.getters['submission/showLoginModal']
        },
        isTokenExpired(){
            return localStorage.getItem('token')
        }
    },
    methods:{
        handleSubmit(){
            if(!(this.user && this.password)){
                return
            }
            const formData = new FormData()
            formData.append('user', this.user)
            formData.append('password', this.password)
            submissionService.login(formData)
            .then(resp => {
                //store token in vuex (localStorage)
            localStorage.setItem('token',resp.data)
            this.$nextTick(() => {
                this.$store.dispatch('submission/hideLoginModal')
                this.$store.commit('submission/setAlert',{variant:'success',message:'Welcome back '+ this.user+'!'})
                this.$store.dispatch('submission/showAlert')
            })
            }).catch(e => {
                this.$store.dispatch('submission/hideLoginModal')
                this.$store.commit('submission/setAlert',{variant:'danger',message:e})
                this.$store.dispatch('submission/showAlert')
                this.$router.push('/')
            })
        },
        resetModal() {
            this.user = ''
            this.password = ''
        },
        handleOk(bvModalEvt) {
            // Prevent modal from closing
            bvModalEvt.preventDefault()
            // Trigger submit handler
            this.handleSubmit()
        },
    },
}
</script>
