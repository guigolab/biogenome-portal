import { defineStore } from 'pinia'
import { Annotation, Assembly, ChromosomeInterface, ErrorResponseData } from '../data/types'
import { useToast } from 'vuestic-ui'
import AssemblyService from '../services/AssemblyService'
import { AxiosError } from 'axios'
import CommonService from '../services/CommonService'
import { buildGenomeBrowserSession } from '../composable/buildGenomeBrowserSession'

export const useGenomeBrowserStore = defineStore('jbrowse', {
   state: () => {
      return {
         query: {
            chromosomes__not__size: 0,
            filter: '',
            taxon_lineage: undefined as string | undefined,
         },
         pagination: {
            limit: 10,
            offset: 0,
         },
         total: 0,
         sessions: [] as Record<string, any>[],
         withAnnotations: false,
         assembly: null as Assembly | null,
         selectedAssembly: null as Assembly | null,
         assemblies: [] as Assembly[],
         availableAnnotations: [] as Annotation[],
         annotations: [] as Annotation[],
         chromosomes: [] as ChromosomeInterface[],
         selectedAnnotations: [] as Annotation[],
         selectedChromosomes: [] as ChromosomeInterface[],
         defaultSession: null as Record<string, any> | null,
         toast: useToast().init,
      }
   },

   actions: {
      resetSelection() {
         this.selectedAssembly = null
         this.availableAnnotations = []
         this.selectedAnnotations = []
         this.selectedChromosomes = []
         this.defaultSession = null
      },
      async initializeSelection(accession: string, annotationName?: string) {
         await this.fetchAssembly(accession)
         await Promise.all([this.fetchAnnotations(accession), this.fetchChromosomes(accession)])

         if (!this.assembly) return null

         const availableAnnotations = [...this.annotations]
         let selectedAnnotations = [...availableAnnotations]
         let resolvedAnnotationName: string | undefined

         if (annotationName) {
            const normalizedQuery = annotationName.trim().toLowerCase()
            const matched = availableAnnotations.find((annotation) => annotation.name.toLowerCase() === normalizedQuery)
            if (matched) {
               selectedAnnotations = [matched]
               resolvedAnnotationName = matched.name
            } else {
               this.toast({
                  color: 'warning',
                  message: `Annotation "${annotationName}" was not found for ${this.assembly.accession}. Loaded all annotations instead.`,
               })
            }
         }

         const selectedChromosomes = [...this.chromosomes]
         const session = buildGenomeBrowserSession(this.assembly, selectedAnnotations, selectedChromosomes)

         this.selectedAssembly = { ...this.assembly }
         this.availableAnnotations = [...availableAnnotations]
         this.selectedAnnotations = [...selectedAnnotations]
         this.selectedChromosomes = [...selectedChromosomes]
         this.defaultSession = session

         return {
            assembly: this.selectedAssembly,
            availableAnnotations: this.availableAnnotations,
            selectedAnnotations: this.selectedAnnotations,
            selectedChromosomes: this.selectedChromosomes,
            defaultSession: this.defaultSession,
            resolvedAnnotationName,
         }
      },
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
            const { data } = await AssemblyService.getRelatedChromosomes(accession)
            this.chromosomes = [...data]
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
            const { data } = await CommonService.getItem('assemblies', accession)
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
      async fetchAssembliesFromAnnotations(isPush = false) {
         try {
            const { filter, taxon_lineage } = this.query
            const query = { filter, taxon_lineage, ...this.pagination }
            const { data } = await AssemblyService.getAssembliesFromAnnotations(query)
            if (isPush) {
               this.assemblies = [...this.assemblies, ...data.data]
            } else {
               this.assemblies = [...data.data]
            }
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
      async fetchAssemblies(isPush = false) {
         try {
            const { data } = await CommonService.getItems('assemblies', { ...this.query, ...this.pagination })
            if (isPush) {
               this.assemblies = [...this.assemblies, ...data.data]
            } else {
               this.assemblies = [...data.data]
            }
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
   },
})
