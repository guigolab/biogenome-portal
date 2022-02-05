<template>
    <b-modal
      id="login-modal"
      ref="modal"
      title="Login"
      @show="resetModal"
      @hidden="resetModal"
      @ok="handleOk"
    >
      <b-form ref="form" @submit.stop.prevent="handleSubmit">
        <b-form-group
          label="Name"
          label-for="name-input"
        >
          <b-form-input
            id="name-input"
            v-model="user"
            required
          ></b-form-input>
        </b-form-group>
          <b-form-group
          label="Password"
          label-for="name-input"
        >
          <b-form-input
            id="password-input"
            v-model="password"
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
import {mapFields} from '../../helper'

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
        })
    },
    methods:{
        handleSubmit(){
            const formData = new FormData()
            formData.append('user', this.user)
            formData.append('password', this.password)
            submissionService.login(formData).then(resp => {
                //store token in vuex (localStorage)
                 this.token = resp.data
                 this.$router.push('/admin')
                  this.$nextTick(() => {
                    this.$bvModal.hide('login-modal')
                    })
            }).catch(e => {
                console.log(e)
            })
        },
        checkFormValidity() {
            const valid = this.$refs.form.checkValidity()
            this.formState = valid
            return valid
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
    mounted(){
        this.$root.$emit('bv::show::modal', 'login-modal')
    }
}
</script>
