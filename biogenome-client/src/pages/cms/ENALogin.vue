<template>
    <div class="layout va-gutter-5">
        <div class="row justify-center align-center">
            <div class="flex lg6 md6 sm12 xs12">
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <h1 class="va-h1">
                            Login to ENA
                        </h1>
                        <p class="va-text-secondary">
                            Insert the ENA login credentials, you can create an account <a class="va-link"
                                href="https://www.ebi.ac.uk/ena/submit/webin/accountInfo" target="_blank">here</a>
                        </p>
                    </div>
                </div>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaCard>
                            <VaCardContent>
                                <VaForm tag="form" ref="form" @submit.prevent="login">
                                    <div class="row">
                                        <div class="flex lg12 md12 sm12 xs12">
                                            <VaInput placeholder="Webin account" v-model="username" :rules="[
                                                (v: string) => !!v || 'Mandadory field',
                                                // (v) => !!isLoggedIn || 'You must login first'
                                            ]"></VaInput>
                                        </div>
                                        <div class="flex lg12 md12 sm12 xs12">
                                            <VaInput v-model="password" placeholder="Webin password" :type="inputType"
                                                :rules="[
                                                    (v: string) => !!v || 'Mandadory field',
                                                    // (v) => !!isLoggedIn || 'You must login first'
                                                ]">
                                                <template #appendInner>
                                                    <VaIcon
                                                        :name="inputType === 'password' ? 'visibility' : 'visibility_off'"
                                                        @click=" inputType === 'password' ? (inputType = 'text') : (inputType = 'password')" />
                                                </template>
                                            </VaInput>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="flex lg12 md12 sm12 xs12">
                                            <VaButton type="submit">Login to ENA
                                            </VaButton>
                                        </div>
                                    </div>
                                </VaForm>
                            </VaCardContent>
                        </VaCard>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useSampleStore } from '../../stores/sample-store';
import { useForm } from 'vuestic-ui';
import { useRouter } from 'vue-router';

const { validate } = useForm('form')
const sampleStore = useSampleStore()
const username = ref('')
const password = ref('')
const inputType = ref('password')
const router = useRouter()

async function login() {
    if (!validate()) return
    await sampleStore.loginToENA(username.value, password.value)
    router.push({ name: 'publish-biosample' })
}
</script>