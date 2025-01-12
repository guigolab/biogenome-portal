<template>
    <Header :title="title" :description="description" />
    <va-inner-loading :loading="isLoading">
        <va-form @submit.prevent="handleSubmit">
            <VaCard>
                <VaCardContent>
                    <div class="row">
                        <div class="flex">
                            <va-input label="user name" v-model="user.name"></va-input>

                        </div>
                        <div class="flex">
                            <va-input label="user password" v-model="user.password"></va-input>

                        </div>
                        <div class="flex">
                            <va-select label="user role" v-model="user.role"
                                :options="['DataManager', 'Admin']"></va-select>
                        </div>
                    </div>
                    <div v-if="user.role === 'DataManager'" class="row">
                        <div class="flex">
                            <va-select hideSelected searchable highlight-matched-text multiple textBy="scientific_name"
                                trackBy="taxid" label="select organisms" @update:search="handleSearch"
                                v-model="userOrganisms" placeholder="search organisms" :options="organisms"
                                :max-visible-options="1">
                            </va-select>
                        </div>
                        <div class="flex">
                            <va-select :max-visible-options="1" textBy="scientific_name" trackBy="taxid" multiple
                                searchable label="user organisms" v-model="userOrganisms" :options="userOrganisms">

                            </va-select>
                        </div>
                    </div>
                    <div class="row justify-space-between">

                        <div class="flex">
                            <va-button type="reset" color="danger" @click="reset">Reset</va-button>
                        </div>
                        <div class="flex">
                            <va-button :disabled="!isValid" type="submit">Submit</va-button>
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </va-form>
    </va-inner-loading>

</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AuthService from '../services/AuthService';
import { useToast } from 'vuestic-ui/web-components';
import { useRouter } from 'vue-router';
import ItemService from '../services/ItemService';
import Header from '../components/Header.vue';


const router = useRouter()
const { init } = useToast()

const props = defineProps<{
    name?: string
}>()

const title = "User Form"

const description = computed(() => props.name ? `Edit ${props.name}` : 'Create a new user')

const isValid = computed(() => user.value && user.value.name && user.value.password)
const filter = ref<string>('')

const isLoading = ref(false)

const initUser = {
    name: '',
    password: '',
    role: 'DataManager' as 'DataManager' | 'Admin',
    species: []
}


const userOrganisms = ref<Record<string, any>[]>([])
const organisms = ref<Record<string, any>[]>([])

const user = ref<{
    name: string,
    password: string,
    role: 'DataManager' | 'Admin',
    species: string[]
}>({ ...initUser })

watch(() => user.value.role, async (v) => {
    if (v === 'DataManager' && user.value.name) {
        await getRelatedOrganism(user.value.name)
    }
})

async function getRelatedOrganism(name: string) {
    const { data } = await AuthService.getUserSpecies(name, { limit: 1000 })
    userOrganisms.value = [...data.data]
}

onMounted(async () => {
    if (props.name) {
        const { data } = await AuthService.getUser(props.name)
        user.value = { ...data }
        await getRelatedOrganism(user.value.name)
    }
})

async function handleSearch(v: string) {
    filter.value = v
    const { data } = await ItemService.getItems('organisms', { filter: filter.value })
    if (data.data) organisms.value = [...data.data]
}

async function handleSubmit() {
    try {
        isLoading.value = true
        if (props.name) {
            user.value.species = [...userOrganisms.value.map(o => o.taxid)]
            const { data } = await AuthService.updateUser(user.value.name, { ...user.value })
            init({ message: `User ${user.value.name} successfully updated`, color: 'success' })
            router.push({ name: 'users' })
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