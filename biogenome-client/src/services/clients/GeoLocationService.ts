import {base} from '../http-axios'

 

class GeoLocationService {
  getLocations(params:Record<string,any>) {
    return base.get('/coordinates', { params: params })
  }
  getLocation(coords:string) {
    return base.get(`/coordinates/${coords}`)
  }
  getLocationsFrequency(params:Record<string,any>) {
    return base.get('/coordinates/frequency', { params: params })
  }
}

export default new GeoLocationService()
