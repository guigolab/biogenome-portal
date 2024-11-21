import http from '../../http-axios'

const base = http.base

class GeoLocationService {
  getLocations(params) {
    return base.get('/coordinates', { params: params })
  }
  getLocation(coords) {
    return base.get(`/coordinates/${coords}`)
  }
  getLocationsFrequency(params) {
    return base.get('/coordinates/frequency', { params: params })
  }
}

export default new GeoLocationService()
