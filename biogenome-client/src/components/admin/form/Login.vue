<template>
<va-modal v-model="authStore.showModal" hide-default-actions>
    <va-inner-loading :loading="authStore.isLoading">
        <div class="layout">
            <div class="row">
                <div class="flex">
                    <h1 class="display-3">Login Form</h1>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <va-alert class="custom-card" closeable :title="authStore.message.text" v-model="showAlert" border="left" :border-color="authStore.message.color"/>
                </div>
            </div>
            <va-divider/>
            <div class="row">
                <div class="flex">
                    <va-input
                        class="login-input"
                        label="Name"
                        v-model="authStore.user.name"
                    />
                </div>
            </div>
            <div class="row">
                <div class="flex">
                    <va-input
                        class="login-input"
                        label="Password"
                        :type="inputType"
                        v-model="authStore.user.password"
                    >
                        <template #appendInner>
                            <va-icon
                                :name="inputType === 'password'? 'visibility': 'visibility_off'"
                                @click="inputType === 'password'? inputType = 'text':inputType = 'password'"
                            />
                        </template>
                    </va-input>
                </div>
            </div>
        </div>
    </va-inner-loading>
    <template #footer>
        <div class="row justify--space-between">
            <div class="flex">
                <va-button color="danger" @click="reset()" >
                    Reset
                </va-button>
            </div>
            <div class="flex">
                <va-button :disabled="!isValidForm" @click="login()" >
                    Login
                </va-button>
            </div>
        </div>
    </template>
</va-modal>
</template>
<script setup>
import {auth} from '../../../stores/auth'
import {computed, ref} from 'vue'


const showAlert = ref(false)

const inputType = ref('password')

const authStore = auth()

const isValidForm = computed(()=>{
    return authStore.user.name && authStore.user.password
})

function login(){
    authStore.login()
    showAlert.value=true
}

function reset(){
    authStore.user.name = ''
    authStore.user.password = ''
}

function logout(){
    authStore.logout()
    showAlert.value = true
}

</script>
<style scoped>
.login-input{
    padding:15px;
}
</style>