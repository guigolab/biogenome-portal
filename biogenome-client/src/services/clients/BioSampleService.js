import http from '../../http-axios'

const base = http.base

class BioSampleService {
  getBioSamples(params) {
    return base.get('/biosamples', { params: params })
  }
  getBioSample(accession) {
    return base.get(`/biosamples/${accession}`)
  }
  getBioSampleRelatedData(accession, model) {
    return base.get(`/biosamples/${accession}/${model}`)
  }
}

export default new BioSampleService()
