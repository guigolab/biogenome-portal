import { defineStore } from 'pinia'
import { Annotation, Assembly, ChromosomeInterface, ErrorResponseData } from '../data/types'
import { useToast } from 'vuestic-ui'
import AssemblyService from '../services/AssemblyService'
import { AxiosError } from 'axios'
import CommonService from '../services/CommonService'

export const useGenomeBrowserStore = defineStore('jbrowse', {
    state: () => {
        return {
            query: {
                chromosomes__not__size: 0,
                filter: '',
                taxon_lineage: undefined as string | undefined
            },
            pagination: {
                limit: 10,
                offset: 0
            },
            total: 0,
            sessions: [] as Record<string, any>[],
            withAnnotations: false,
            assembly: null as Assembly | null,
            assemblies: [] as Assembly[],
            annotations: [] as Annotation[],
            chromosomes: [] as ChromosomeInterface[],
            selectedAnnotations: [] as Annotation[],
            selectedChromosomes: [] as ChromosomeInterface[],
            toast: useToast().init

        }
    },

    actions: {
        async fetchAnnotations(accession: string) {
            try {
                const { data } = await AssemblyService.getRelatedAnnotations(accession)
                this.annotations = [...data]
            } catch (error) {
                const axiosError = error as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            }
        },
        async fetchChromosomes(accession: string) {
            try {
                const { data } = await AssemblyService.getRelatedChromosomes(accession);
                this.chromosomes = [...data];
            } catch (error) {
                const axiosError = error as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            }
        },
        async fetchAssembly(accession: string) {
            try {
                const { data } = await AssemblyService.getAssembly(accession);
                this.assembly = { ...data }
            } catch (error) {
                const axiosError = error as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            }
        },
        async fetchAssembliesFromAnnotations() {
            try {
                const { filter, taxon_lineage } = this.query
                const query = { filter, taxon_lineage, ...this.pagination }
                const { data } = await AssemblyService.getAssembliesFromAnnotations(query);
                this.assemblies = [...data.data];
                this.total = data.total
            } catch (error) {
                const axiosError = error as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            }
        },
        async fetchAssemblies() {
            try {
                const { data } = await CommonService.getItems('assemblies', { ...this.query, ...this.pagination });
                this.assemblies = [...data.data];
                this.total = data.total
            } catch (error) {
                const axiosError = error as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            }
        }

    },
})
