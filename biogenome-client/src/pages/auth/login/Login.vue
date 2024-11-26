<template>
  <div class="row justify-center align-center">
    <div class="flex lg4 md6 sm12 xs12">
      <va-form tag="form" @submit.prevent="handleSubmit">
        <va-input v-model="name" class="mt-3" label="username"> </va-input>
        <va-input v-model="password" class="mt-3" label="password" :type="inputType">
          <template #appendInner>
            <va-icon :name="inputType === 'password' ? 'visibility' : 'visibility_off'"
              @click="inputType === 'password' ? (inputType = 'text') : (inputType = 'password')" />
          </template>
        </va-input>
        <va-button :disabled="!name || !password" class="mt-3" type="submit">
          Login
        </va-button>
      </va-form>
    </div>
  </div>

</template>
<script setup lang="ts">
import { useGlobalStore } from '../../stores/global-store'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const globalStore = useGlobalStore()

const name = ref('')
const password = ref('')
const inputType = ref('password')

async function handleSubmit() {
  await globalStore.login(name.value, password.value)
  if (globalStore.isAuthenticated) router.push('/cms-dashboard')

}
</script>
