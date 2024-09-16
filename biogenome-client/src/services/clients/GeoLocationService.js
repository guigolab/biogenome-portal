import http from '../../http-axios'

const base = http.base

class GeoLocationService {
  getLocations(params) {
    return base.get('/coordinates', { params: params })
  }
}

export default new GeoLocationService()
