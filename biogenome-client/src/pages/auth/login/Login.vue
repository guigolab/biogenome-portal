<template>
  <va-form tag="form" style="width: 300px" @submit.prevent="handleSubmit">
    <va-input v-model="GlobalStore.userName" class="mt-3" label="username"> </va-input>
    <va-input v-model="GlobalStore.userPassword" class="mt-3" label="password" :type="inputType">
      <template #appendInner>
        <va-icon :name="inputType === 'password' ? 'visibility' : 'visibility_off'"
          @click="inputType === 'password' ? (inputType = 'text') : (inputType = 'password')" />
      </template>
    </va-input>
    <va-button :disabled="!GlobalStore.userName || !GlobalStore.userPassword" class="mt-3" type="submit">
      Login
    </va-button>
  </va-form>
</template>
<script setup lang="ts">
import { useGlobalStore } from '../../../stores/global-store'
import AuthService from '../../../services/clients/AuthService'
import { ref } from 'vue'
import { useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'

const router = useRouter()
const { init } = useToast()
const GlobalStore = useGlobalStore()

const inputType = ref('password')

async function handleSubmit() {
  try {
    const { data } = await AuthService.login({ name: GlobalStore.userName, password: GlobalStore.userPassword })
    GlobalStore.isAuthenticated = true
    GlobalStore.userRole = data.role
    if(data.species) GlobalStore.userSpecies = [...data.species]
    init({ message: `Welcome ${GlobalStore.userName}`, color: 'success' })
    router.push('/cms-dashboard')
  } catch (error) {
    init({ message: 'Bad user or password', color: 'danger' })
  }
  GlobalStore.showLoginModal = false
}
</script>
