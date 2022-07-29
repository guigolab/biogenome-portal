<template>
<va-inner-loading :loading="isLoading">
<div class="layout">
    <div class="row">
        <div class="flex">
            <h1 class="display-3">Login Form</h1>
        </div>
    </div>
    <va-divider/>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-card class="custom-card" stripe stripe-color="danger">
                <va-card-content v-if="!authStore.isAuthenticated">
                    <va-form    
                        tag="form"
                        ref="login"
                        @submit.prevent="authStore.login()"
                        @validation="validForm = $event"
                        >
                        <va-input
                        class="login-input"
                        label="Name"
                        v-model="authStore.user.name"
                        :rules="[value => (value && value.length > 0) || 'Field is required']"
                        />
                        <va-input
                        class="login-input"
                        label="Password"
                        v-model="authStore.user.password"
                        :rules="[value => (value && value.length > 0) || 'Field is required']"
                        />
                        <va-button @click="$refs.login.validate()">
                            Validate
                        </va-button>
                        <va-button :disabled="!validForm" type="submit" >
                            Login
                        </va-button>
                    </va-form>
                </va-card-content>
                <va-card-content v-else>
                    <va-button @click="authStore.logout()">
                        Logout
                    </va-button>
                </va-card-content>
            </va-card>
        </div>
    </div>
</div>
</va-inner-loading>

</template>
<script setup>
import {auth} from '../../../stores/auth'
import {ref} from 'vue'

const validForm = ref(false)

const authStore = auth()

</script>
<style scoped>
.login-input{
    padding:15px;
}
</style>