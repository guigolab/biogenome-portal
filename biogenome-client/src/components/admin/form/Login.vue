<template>
    <va-card v-if="!authStore.isAuthenticated" stripe stripe-color="danger">
        <va-card-title>
            LOGIN
        </va-card-title>
        <va-card-content>
            <va-form    
                tag="form"
                ref="login"
                @submit.prevent="authStore.login()"
                @validation="validForm = $event"
                >
                <va-input
                label="Name"
                v-model="authStore.user.name"
                :rules="[value => (value && value.length > 0) || 'Field is required']"
                />
                <va-input
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
    </va-card>
    <va-card v-else stripe stripe-color="success">
        <va-card-title>
            {{`${authStore.user.name} (${authStore.user.role})`}}
        </va-card-title>
        <va-card-content>
            <va-button @click="authStore.logout()">
                Logout
            </va-button>
        </va-card-content>
    </va-card>
</template>
<script setup>
import {auth} from '../../../stores/auth'
import {ref} from 'vue'

const validForm = ref(false)

const authStore = auth()

</script>