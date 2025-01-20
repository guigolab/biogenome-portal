import { defineStore } from 'pinia'
import ConfigService from '../services/ConfigService'
import { AxiosError } from 'axios'
import { ErrorResponseData, AppConfig } from '../data/types'
import { useGlobalConfig, useToast } from 'vuestic-ui/web-components'


const initConfig: AppConfig = {
    dashboard: {
        title: undefined,
        description: undefined,
        label: undefined,
        filters: undefined,
        columns: undefined,
        charts: undefined
    },
    general: {},
    ui: {},
    models: {
        biosamples: {
            title: undefined,
            description: undefined,
            label: undefined,
            filters: undefined,
            columns: undefined,
            charts: undefined
        },
        experiments: {
            title: undefined,
            description: undefined,
            label: undefined,
            filters: undefined,
            columns: undefined,
            charts: undefined
        },
        organisms: {
            title: undefined,
            description: undefined,
            label: undefined,
            filters: undefined,
            columns: undefined,
            charts: undefined
        },
        annotations: {
            title: undefined,
            description: undefined,
            label: undefined,
            filters: undefined,
            columns: undefined,
            charts: undefined
        },
        assemblies: {
            title: undefined,
            description: undefined,
            label: undefined,
            filters: undefined,
            columns: undefined,
            charts: undefined
        },
        local_samples: {
            title: undefined,
            description: undefined,
            label: undefined,
            filters: undefined,
            columns: undefined,
            charts: undefined
        }
    }
}

export const useConfigStore = defineStore('config', {
  state: () => {
    return {
      configs: { ...initConfig } as AppConfig,
      isLoading:true,
      toast: useToast().init
    }
  },

  actions: {
    async fetchConfig(){
        try{
            const {data} = await ConfigService.getConfig()
            this.configs = {...data} as AppConfig
            if(this.configs.ui && Object.keys(this.configs.ui).length) {
                const {mergeGlobalConfig} = useGlobalConfig()
                mergeGlobalConfig({...this.configs.ui})
            }
        }catch(error){
            console.error(error)
            const axiosError = error as AxiosError<ErrorResponseData>
            let message
            if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                message = axiosError.response.data.message

            } else {
                message = axiosError.message
            }
            this.toast({ message: message, color: 'danger' })
        }finally{
            this.isLoading = false
        }
    },
  },
})
