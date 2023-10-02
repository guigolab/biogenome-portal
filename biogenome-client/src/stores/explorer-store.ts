import { defineStore } from 'pinia'
import {tabs} from '../pages/taxonomy/configs'

export const useExplorerStore = defineStore('explorer', {
    state: () => {
      return {
        selectedTab:tabs[0].title
      }
    },
  
  })