import { models, maps } from '../../../config.json'

export interface INavigationRoute {
  name: string,
  icon: string,
  displayName: string
}

const routes = Object.entries(models).map(([k, v]) => {
  return {
    name: k,
    icon: v.icon,
    displayName: `routes.${k}`,
  }
})

const mapRoutes = maps.map(m => {
  const icon = m === 'samples-map' ? 'fa-map' : 'public'
  return {
    name: m,
    icon: icon,
    displayName: `routes.${m}`
  }
})

export default {
  root: {
    name: 'dashboard',
    displayName: 'routes.dashboard',
  },
  routes: [{
    name: 'dashboard',
    displayName: 'routes.dashboard',
    icon: "vuestic-iconset-dashboard"
  }, 
  {
    name: 'taxonomy',
    displayName: 'routes.taxonomy',
    icon: 'travel_explore'
  },
  ...routes, ...mapRoutes],
}
