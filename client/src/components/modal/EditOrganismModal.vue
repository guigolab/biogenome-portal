<template>
    <b-modal
      id="organism-modal"
      ref="modal"
      :title="organism? organism.organism:''"
      @ok="handleOk"
    >
      <b-form ref="form" @submit.stop.prevent="handleSubmit">
        <b-form-group
          label="Image url"
          label-for="url-input"
        >
          <b-form-input
            id="url-input"
            v-model="imageUrl"
          ></b-form-input>
        </b-form-group>
        <b-form-group
          label="Image file"
          label-for="file-input"
        >
        <b-input-group>
          <b-form-file
            id="file-input"
            v-model="imageFile"
          ></b-form-file>
          <b-input-group-append>
              <b-button :disabled="!imageFile" @click="imageFile=null">Clear</b-button>
          </b-input-group-append>
        </b-input-group>
        <b-form-checkbox
            v-model="deleteImage">
            delete current image
        </b-form-checkbox>
        </b-form-group>
          <b-form-group
          label="Common names"
          label-for="names-input"
        >
          <b-form-textarea
            id="names-input"
            v-model="commonNames"
          ></b-form-textarea>
        </b-form-group>

      </b-form>
</b-modal>
</template>
<script>
import {BForm,BFormGroup,BButton,BFormCheckbox,BFormInput,BInputGroup,BInputGroupAppend,BFormTextarea, BFormFile} from 'bootstrap-vue'
import submissionService from '../../services/SubmissionService'

export default {
    props: ['organism', 'commonNames'],
    data(){
        return {
            imageFile: null,
            imageUrl: '',
            deleteImage:false,
        }
    },
    components: {
        BForm,BFormGroup,BFormInput,BButton,BFormCheckbox,BFormTextarea, BFormFile,BInputGroup,BInputGroupAppend
    },
    mounted(){
        console.log(this.organism && this.organism.commonNames)
        this.commonNames = this.organism && this.organism.commonNames ? 
            this.organism.commonNames.join() : ''
        this.imageUrl = this.organism && this.organism.image_url ? 
            this.organism.image_url : ''
    },
    methods:{
        handleSubmit(){
            const formData = new FormData()
            if (this.deleteImage){
                formData.append('delete_image', this.deleteImage)
            }else {
                formData.append('image_url', this.imageUrl)
                formData.append('image', this.imageFile)
            }
            formData.append('common_name', this.commonNames)

            submissionService.updateOrganism(this.organism.organism, formData)
            .then(resp => {
                console.log(resp)
                this.$store.commit('submission/setAlert',{variant:'success',message: this.organism.organism + ' has been successfully modified!'})
                this.$store.dispatch('submission/showAlert')
                this.resetModal()
                this.$bvModal.hide('organism-modal')
            }).catch(e => {
                console.log(e)
                this.$store.commit('submission/setAlert',{variant:'warning',message:e})
                this.$store.dispatch('submission/showAlert')
            })
        },
        resetModal() {
            this.imageUrl = ''
            this.imageFile = null
            this.commonNames = ''
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
