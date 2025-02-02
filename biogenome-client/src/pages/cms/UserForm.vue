<template>
    <Header :title="title" :description="description" />
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <h2 class="va-h6">
                                Users Details
                            </h2>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <div class="row">
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaInput :disabled="!!name" label="user name" v-model="user.name"></VaInput>

                        </div>
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaInput label="user password" v-model="user.password"></VaInput>

                        </div>
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaSelect label="user role" v-model="user.role" :options="['DataManager', 'Admin']">
                            </VaSelect>
                        </div>
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaInput label="Email (optional)" v-model="user.email"></VaInput>

                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
    <div v-if="user.role === 'DataManager'" class="row row-equal">
        <div class="flex lg6 md6 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between">
                        <div class="flex">
                            <h2 class="va-h6">
                                Available Organisms
                            </h2>
                            <p class="va-text-secondary">Click over a species to assign it, start typing in the filter
                                to show species</p>
                        </div>
                        <div class="flex">
                            <VaCheckbox label="Show only unassigned organisms" v-model="onlyAvailableOrganisms"
                                @update:modelValue="handleSearch('')"></VaCheckbox>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <div class="row">
                        <div class="flex lg12 md12 sm12 xs12">
                            <VaInput clearable v-model="availableSpeciesFilter" @update:model-value="handleSearch"
                                placeholder="Search a species"></VaInput>
                        </div>
                    </div>
                    <div class="row">
                        <div class="flex lg12 md12 sm12 xs12">
                            <VaDataTable hoverable clickable @row:click="handleClick" height="400px" sticky-header
                                :columns="['scientific_name', 'goat_status', 'target_list_status']"
                                :items="filteredOrganisms">
                            </VaDataTable>
                        </div>
                    </div>
                    <div class="row justify-center">
                        <div class="flex">
                            <VaPagination color="textPrimary" v-model="offset" :page-size="pagination.limit"
                                :total="total" :visible-pages="3" rounded buttons-preset="primary" gapped />
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <h2 class="va-h6">
                                Assigned organisms
                            </h2>
                            <p class="va-text-secondary">Select organisms to remove</p>

                        </div>
                        <div v-if="selectedAssignedSpecies.length" class="flex">
                            <VaButton @click="handleRemove" preset="secondary" color="danger">Remove {{
                                selectedAssignedSpecies.length }}
                                Organisms</VaButton>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <div class="row">
                        <div class="flex lg12 md12 sm12 xs12">
                            <VaInput clearable v-model="assignedSpeciesFilter" placeholder="Search"></VaInput>
                        </div>
                    </div>
                    <div class="row">
                        <div class="flex lg12 md12 sm12 xs12">
                            <VaDataTable selectable select-mode="multiple" v-model="selectedAssignedSpecies"
                                :filter="assignedSpeciesFilter" height="400px" sticky-header
                                :columns="['scientific_name', 'goat_status', 'target_list_status']"
                                :items="userOrganisms"></VaDataTable>

                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
    <div class="row justify-space-between">
        <div class="flex lg12 md12 sm12 xs12">
            <VaButton :loading="isLoading" @click="handleSubmit" :disabled="!isValid" preset="terti" block>Submit
            </VaButton>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AuthService from '../../services/AuthService';
import { useToast } from 'vuestic-ui/web-components';
import { useRouter } from 'vue-router';
import ItemService from '../../services/CommonService';
import Header from '../../components/cms/Header.vue';
import OrganismService from '../../services/OrganismService';


const router = useRouter()
const { init } = useToast()

const props = defineProps<{
    name?: string
}>()

const title = "User Form"

const description = computed(() => props.name ? `Edit ${props.name}` : 'Create a new user')

const isValid = computed(() => user.value && user.value.name && user.value.password)
const filter = ref<string>('')
const pagination = reactive({
    limit: 10,
    offset: 0
})

const offset = computed({
    get() {
        return pagination.offset + 1
    },
    set(v: number) {
        pagination.offset = v - 1
    }
})

watch(() => offset.value, async () => {
    await handleSearch("")
})
const isLoading = ref(false)
const total = ref(0)
const assignedSpeciesFilter = ref('')
const availableSpeciesFilter = ref('')
const onlyAvailableOrganisms = ref(true)
const initUser = {
    name: '',
    password: '',
    role: 'DataManager' as 'DataManager' | 'Admin',
    email: '',
    species: []
}

const selectedAssignedSpecies = ref<Record<string, any>[]>([])

const userOrganisms = ref<Record<string, any>[]>([])
const organisms = ref<Record<string, any>[]>([])

const filteredOrganisms = computed(() => {
    return organisms.value.filter(({ taxid }) => !userOrganisms.value.map((org) => org.taxid).includes(taxid))
}

)
const user = ref<{
    name: string,
    password: string,
    role: 'DataManager' | 'Admin',
    email: string,
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

function handleRemove() {
    const mappedItems = selectedAssignedSpecies.value.map(({ taxid }) => taxid)
    const filteredOrganisms = userOrganisms.value.filter(({ taxid }) => !mappedItems.includes(taxid))
    userOrganisms.value = [...filteredOrganisms]
    selectedAssignedSpecies.value = []
}
onMounted(async () => {
    if (props.name) {
        const { data } = await AuthService.getUser(props.name)
        user.value = { ...data }
        await getRelatedOrganism(user.value.name)
    }
    await handleSearch("")
})

async function handleSearch(v: string) {
    filter.value = v
    if (onlyAvailableOrganisms.value) {
        const { data } = await OrganismService.getUnassignedOrganisms({ filter: filter.value, ...pagination })
        organisms.value = [...data.data]
        total.value = data.total
    } else {
        const { data } = await ItemService.getItems('organisms', { filter: filter.value, ...pagination })
        organisms.value = [...data.data]
        total.value = data.total
    }
}

async function handleSubmit() {
    try {
        isLoading.value = true
        user.value.species = [...userOrganisms.value.map(o => o.taxid)]

        if (props.name) {
            const { data } = await AuthService.updateUser(user.value.name, { ...user.value })
            init({ message: `User ${user.value.name} successfully updated`, color: 'success' })
        } else {
            const { data } = await AuthService.createUser({ ...user.value })
            init({ message: `User ${user.value.name} successfully created`, color: 'success' })

        }
        router.push({ name: 'users' })

    } catch {
        init({ message: "Something happened", color: 'danger' })

    } finally {
        isLoading.value = false

    }

}

const handleClick = async (event: any) => {
    const { item } = event
    userOrganisms.value.push(item)
}

function reset() {
    user.value = { ...initUser }
    userOrganisms.value = []
}


</script>