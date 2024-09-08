import { defineVuesticConfig } from 'vuestic-ui'
import ui from './configs/ui.json'
import iconsConfig from './vuestic-ui/icons-config/icons-config'

export default defineVuesticConfig({
    // Config here
    icons: iconsConfig,
    ...ui
})