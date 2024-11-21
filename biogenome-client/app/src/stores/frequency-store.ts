import { defineStore } from 'pinia'
import { ErrorResponseData, ConfigFilter, DataModels, Frequency } from '../data/types'
import StatisticsService from '../services/StatisticsService'
import { AxiosError } from 'axios'
import { useConfig } from '../composable/useConfig'
import { useToast } from 'primevue/usetoast'


export const useItemStore = defineStore('item', {
    state: () => {

        return {
            frequencies: [] as Frequency[],
            toast: useToast()
        }
    },

    actions: {
        catchError(error: any) {
            console.error(error)
            const axiosError = error as AxiosError<ErrorResponseData>
            let message
            if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                message = axiosError.response.data.message

            } else {
                message = axiosError.message
            }
            this.toast.add({ severity: 'error', summary: 'Error fetching stats', detail: message, life: 3000 })
        },
        async fetchFrequenciesForSelectFields(model: DataModels, query: Record<string, any>) {
            const { filters } = useConfig(model)
            const selectFields = filters.value
                .filter((field: ConfigFilter) => field.type === 'select')
                .map((field: ConfigFilter) => field.key);
            for (const field of selectFields) {
                await this.getFrequencies(model, model, field, query);
            }
        },
        //incoming model may not correspond to currentModel
        async getFrequencies(source: string, model: DataModels, field: string, query: Record<string, any>) {
            try {
                const freqs = this.frequencies
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                const newFreq: Frequency = { source, model, field, data }
                const existingIndex = freqs.findIndex(
                    f => f.source === source && f.model === model && f.field === field
                );
                if (existingIndex !== -1) {
                    freqs[existingIndex] = newFreq;
                } else {
                    freqs.push(newFreq);
                }
                this.frequencies = [...freqs]
            } catch (err) {
                this.catchError(err)
            }
        },
    },
})
