import { models, maps } from '../../../config.json'

export interface INavigationRoute {
  name: string,
  displayName: string
}

const routes = Object.entries(models).map(([k, v]) => {
  return {
    name: k,
    displayName: `routes.${k}`,
  }
})

const mapRoutes = maps.map(m => {
  return {
    name: m,
    displayName: `routes.${m}`
  }
})

export default {
  routes: [{
    name: 'dashboard',
    displayName: 'routes.dashboard',
  },
  {
    name: 'taxonomy',
    displayName: 'routes.taxonomy',
  },
  ...routes, ...mapRoutes],
}
