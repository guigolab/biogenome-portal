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
      name: 'far-{code}',
      resolve: ({ code }) => ({ class: `far fa-${code}` }),
    },
    {
      name: 'fal-{code}',
      resolve: ({ code }) => ({ class: `fal fa-${code}` }),
    },
    {
      name: 'material-icons-{code}',
      resolve: ({ code }) => ({ to: code }),
    },
  ],
})
