import http from '../../http-axios'

const base = http.base

class GeoLocationService {
  getLocations(params) {
    return base.get('/coordinates', { params: params })
  }
  getLocationsByTaxon(taxid) {
    return base.get(`/taxons/${taxid}/coordinates`)
  }
  getLocationsByOrganims(taxid) {
    return base.get(`/organisms/${taxid}/coordinates`)
  }
  getLocationsByBioSample(accession) {
    return base.get(`/biosamples/${accession}/coordinates`)
  }
  getLocationsByLocalSample(localId) {
    return base.get(`/local_samples/${localId}/coordinates`)
  }
}

export default new GeoLocationService()
