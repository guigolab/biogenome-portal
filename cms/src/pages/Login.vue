<template>
  <div class="layout va-gutter-5">

    <div style="height: 100vh;" class="row justify-center align-center">
      <div class="flex">
        <h1 class="va-h3">
          Login
        </h1>
        <VaCard>
          <va-form tag="form" @submit.prevent="handleSubmit">
            <VaCardContent>
              <div class="row">
                <div class="flex">
                  <va-input v-model="name" label="username"> </va-input>

                </div>
                <div class="flex">
                  <va-input v-model="password" label="password" :type="inputType">
                    <template #appendInner>
                      <va-icon :name="inputType === 'password' ? 'visibility' : 'visibility_off'"
                        @click="inputType === 'password' ? (inputType = 'text') : (inputType = 'password')" />
                    </template>
                  </va-input>
                </div>
              </div>

            </VaCardContent>
            <VaCardActions align="right">
              <va-button :disabled="!name || !password" type="submit">
                Login
              </va-button>
            </VaCardActions>
          </va-form>
        </VaCard>
      </div>
    </div>
  </div>

</template>
<script setup lang="ts">
import { useGlobalStore } from '../stores/global-store'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const globalStore = useGlobalStore()

const name = ref('')
const password = ref('')
const inputType = ref('password')

async function handleSubmit() {
  await globalStore.login(name.value, password.value)
  if (globalStore.isAuthenticated) router.push('/')

}
</script>
