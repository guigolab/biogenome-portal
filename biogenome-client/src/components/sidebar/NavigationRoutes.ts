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
  const icon = m === '2d-map' ? 'fa-map' : 'public'
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
  }, ...routes, ...mapRoutes],
}
