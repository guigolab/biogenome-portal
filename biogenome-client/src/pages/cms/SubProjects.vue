<template>
    <Header title="Subprojects"
        description="Subprojects may be considered as entities or laboratories in charge of the sequencing of at least one species" />
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between">
                        <div class="flex">
                            <h2 class="va-h6">
                                List of Subprojects
                            </h2>

                        </div>
                        <div class="flex">
                            <VaButton>Create Subproject</VaButton>
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
            <VaCardContent>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaInput v-model="filter" placeholder="Search subproject by name or primary contact" />
                    </div>
                </div>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaDataTable :items="subProjects"
                            :columns="['name', 'primary_contact', 'primary_contact_email']">
                            <template #cell(primary_contact_email)="{ rowData }">
                                <a class="va-link" :href="'mailto:' + rowData.primary_contact_email">{{
                                    rowData.primary_contact_email }}</a>
                            </template>
                        </VaDataTable>
                    </div>
                </div>
            </VaCardContent>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import Header from '../../components/cms/Header.vue';
import AuthService from '../../services/AuthService';


const subProjects = ref<Record<string, any>[]>([])
const filter = ref('')



</script>