import { defineStore } from 'pinia'
import WikiPedia from '../services/WikiPedia'

export const useWikiStore = defineStore('wiki', {
  state: () => {
    return {
      name: null as string | null,
      lang: 'en' as string,
      summary: null as string | null,
      isLoading: false,
    }
  },

  actions: {
    async getSummary(name: string) {
      try {
        this.isLoading = true
        if(this.name && this.name === name) return
        this.name = name
        const { data } = await WikiPedia.getContent(this.lang, name)
        if (data.extract) {
          this.summary = data.extract
        } else {
          this.summary =null
        }
      } catch (e) {
        this.summary = null
      } finally {
        this.isLoading = false
      }
    },
  },
})
