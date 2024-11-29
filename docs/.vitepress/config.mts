import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/biogenome-portal/',
  title: "BioGenome Portal",
  description: "How to deploy, run, install and use the portal",
  appearance: false,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    sidebar: [
      {
        text: 'Introduction', 
        items: [
          { text: 'What is the BGP?', link: '/' },
          { text: 'Launching BGP', link: '/launch-docs' },
        ]
      },
      {
        text: 'Configuration', 
        items: [
          { text: 'Front-End', link: '/front-end-config' },
          { text: 'Cronjobs', link: '/cronjob-docs' },
        ]
      },
      {
        text: 'User Guide', 
        items: [
          // { text: 'User Interface', link: '/ui-docs' },
          { text: 'Admin Area', link: '/cms-docs' },
          { text: 'Application Programming Interface', link: '/api-docs' },
        ]
      },
      {
        text: 'API Schema',
        link: '/api-schema'
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/guigolab/biogenome-portal' }
    ]
  }
})
