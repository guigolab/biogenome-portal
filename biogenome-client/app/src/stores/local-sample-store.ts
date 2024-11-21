import { defineStore } from 'pinia'

const initLocalSampleForm = {
  local_id: '',
  taxid: '',
  scientific_name: '',
  metadata: {} as Record<string, string>,
}

export const useLocalSampleStore = defineStore('local-sample', {
  state: () => {
    return {
      localSampleForm: { ...initLocalSampleForm }
    }
  },
  actions: {

  },
})
