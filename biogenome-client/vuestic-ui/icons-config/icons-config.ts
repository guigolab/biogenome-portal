import { createIconsConfig } from 'vuestic-ui'
import aliases from './aliases'

export default createIconsConfig({
  aliases,
  fonts: [
    {
      name: 'fa-{code}',
      resolve: ({ code }) => ({ class: `fas fa-${code}` }),
    },
    {
      name: 'material-icons-{code}',
      resolve: ({ code }) => ({ to: code }),
    },
  ],
})
