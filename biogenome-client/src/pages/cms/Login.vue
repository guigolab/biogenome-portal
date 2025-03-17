<template>
  <div class="layout va-gutter-5">
    <div class="row justify-center align-center">
      <div class="flex lg6 md6 sm12 xs12">
        <h1 class="va-h1">
          Login
        </h1>
        <VaCard>
          <VaForm tag="form" @submit.prevent="handleSubmit">
            <VaCardContent>
              <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                  <VaInput v-model="name" label="username"> </VaInput>
                </div>
                <div class="flex lg12 md12 sm12 xs12">
                  <VaInput v-model="password" label="password" :type="inputType">
                    <template #appendInner>
                      <VaIcon :name="inputType === 'password' ? 'visibility' : 'visibility_off'"
                        @click="inputType === 'password' ? (inputType = 'text') : (inputType = 'password')" />
                    </template>
                  </VaInput>
                </div>
              </div>
            </VaCardContent>
            <VaCardActions align="right">
              <VaButton block :disabled="!name || !password" type="submit">
                Login
              </VaButton>
            </VaCardActions>
          </VaForm>
          <VaCardContent v-if="adminEmail">
            <a class="va-link"
              :href="`mailto:${adminEmail}?subject=I%20Forgot%20My%20Password&body=Hello,%0D%0A%0D%0AI forgot my password and need assistance resetting it.%0D%0A%0D%0AThank you.`">Forgot
              your password?</a>
          </VaCardContent>
        </VaCard>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useGlobalStore } from '../../stores/global-store'
import { inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppConfig } from '../../data/types'

const router = useRouter()
const globalStore = useGlobalStore()
const appConfig = inject('appConfig') as AppConfig
const adminEmail = appConfig.general.contactEmail

const name = ref('')
const password = ref('')
const inputType = ref('password')

async function handleSubmit() {
  await globalStore.login(name.value, password.value)
  if (globalStore.isAuthenticated) router.push({ name: 'admin' })

}
</script>
