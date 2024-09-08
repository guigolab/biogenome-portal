import general from '../../../configs/general.json'
import pages from '../../../configs/pages.json'

export interface INavigationRoute {
  name: string,
  displayName: string
}

const routes = Object.keys(pages).map(key => {
  return {
    name: key,
    displayName: `routes.${key}`,
  }
})

const taxon = {
  name: 'taxonomy',
  displayName: 'routes.taxonomy',
}
//add taxonomy explorer in second place
routes.splice(1, 0, taxon)

const mapRoutes =
  general.maps && general.maps.length ?
    general.maps.map(m => {
      return {
        name: m,
        displayName: `routes.${m}`
      }
    })
    : []

export default {
  routes: [
    ...routes, ...mapRoutes],
}
