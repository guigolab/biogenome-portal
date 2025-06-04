import {base,download} from '../http-axios'
import { DataModels } from '../data/types'


class GeoLocationService {
  getLocations(params:Record<string,any>) {
    return base.get('/coordinates', { params: params })
  }
  postLocations(data:Record<string,any>){
    return base.post('/coordinates', data)
  }
  getLocation(coords:string) {
    return base.get(`/coordinates/${coords}`)
  }
  getLocationsFrequency(params:Record<string,any>) {
    return base.get('/coordinates/frequency', { params: params })
  }
  postLocationsFrequency(data:Record<string,any>) {
    return base.post('/coordinates/frequency', data)
  }
  getRelatedData(data:Record<string,any>){
    return download.post('/coordinates/frequency/download', data)
  }
  lookupRelatedData(data:Record<string,any>){
    return base.post('/coordinates/frequency/lookup', data)
  }
  lookupRelatedModelData(data:Record<string,any>, model:DataModels){
    return base.post(`/coordinates/frequency/lookup/${model}`, data)
  }

}

export default new GeoLocationService()
