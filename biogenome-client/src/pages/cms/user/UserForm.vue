<template>
    <h4 class="va-h4">User Form</h4>
    <p class="mb-4">{{ name ? `Edit ${name}` : 'Create a new user' }}
    </p>
    <va-inner-loading :loading="isLoading">
        <va-form @submit.prevent="handleSubmit">
            <div class="row align-end">
                <va-input class="flex lg4 md4 sm12 xs12" label="user name" v-model="user.name"></va-input>
                <va-input class="flex lg4 md4 sm12 xs12" label="user password" v-model="user.password"></va-input>
                <va-select class="flex lg4 md4 sm12 xs12" label="user role" v-model="user.role"
                    :options="['DataManager', 'Admin']"></va-select>
                <div v-if="user.role === 'DataManager'" class="flex lg12 md12 sm12 xs12">
                    <div class="row">
                        <va-select hideSelected searchable highlight-matched-text multiple textBy="scientific_name"
                            trackBy="taxid" label="select organisms" @update:search="handleSearch"
                            class="flex lg6 md6 sm12 xs12" v-model="userOrganisms" placeholder="search organisms"
                            :options="organisms" :max-visible-options="1">
                        </va-select>
                        <va-select :max-visible-options="1" textBy="scientific_name" trackBy="taxid"
                            class="flex lg6 md6 sm12 xs12" multiple searchable label="user organisms"
                            v-model="userOrganisms" :options="userOrganisms">

                        </va-select>
                    </div>
                </div>
                <div class="flex">
                    <va-button type="submit">Submit</va-button>
                </div>
                <div class="flex">
                    <va-button type="reset" color="danger" @click="reset">Reset</va-button>
                </div>
            </div>
        </va-form>
    </va-inner-loading>

</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AuthService from '../../services/clients/AuthService';
import OrganismService from '../../services/clients/OrganismService';
import { useToast } from 'vuestic-ui/web-components';
import { useRouter } from 'vue-router';

const router = useRouter()
const { init } = useToast()

const props = defineProps<{
    name?: string
}>()


const filter = ref<string>('')

const isLoading = ref(false)

const initUser = {
    name: '',
    password: '',
    role: null,
    species: []
}


const userOrganisms = ref<Record<string, any>[]>([])
const organisms = ref<Record<string, any>[]>([])

const user = ref<{
    name: string,
    password: string,
    role: 'DataManager' | 'Admin' | null,
    species: string[]
}>({ ...initUser })

watch(() => user.value.role, async (v) => {
    if (v === 'DataManager' && user.value.name) {
        const { data } = await OrganismService.getOrganisms({ user: user.value.name, limit: 1000 })
        userOrganisms.value = [...data.data]
    }
})

onMounted(async () => {
    if (props.name) {
        const { data } = await AuthService.getUser(props.name)
        user.value = { ...data }
        const resp = await OrganismService.getOrganisms({ user: user.value.name, limit: 1000 })
        userOrganisms.value = [...resp.data]
    }
})

async function handleSearch(v: string) {
    filter.value = v
    const { data } = await OrganismService.getOrganisms({ filter: filter.value })
    if(data.data) organisms.value = [...data.data]
}

async function handleSubmit() {
    try {
        isLoading.value = true
        if (props.name) {
            user.value.species = [...userOrganisms.value.map(o => o.taxid)]
            const { data } = await AuthService.updateUser(user.value.name, { ...user.value })
            init({ message: `User ${user.value.name} successfully updated`, color: 'success' })
            router.push({ name: 'cms-users' })
        } else {
            user.value.species = [...userOrganisms.value.map(o => o.taxid)]
            const { data } = await AuthService.createUser({ ...user.value })
            init({ message: `User ${user.value.name} successfully created`, color: 'success' })
            reset()
        }
    } catch {
        init({ message: "Something happened", color: 'danger' })

    } finally {
        isLoading.value = false

    }

}

function reset() {
    user.value = { ...initUser }
    userOrganisms.value = []
}


</script>