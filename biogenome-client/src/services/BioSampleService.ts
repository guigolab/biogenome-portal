import { base } from '../http-axios'

class BioSampleService {
  getBioSamples(params: Record<string, any>) {
    return base.get('/biosamples', { params: params })
  }
  getBioSample(accession: string) {
    return base.get(`/biosamples/${accession}`)
  }
  getBioSampleRelatedData(accession: string, model: string) {
    return base.get(`/biosamples/${accession}/${model}`)
  }
  getLookupData(accession: string) {
    return base.get(`/biosamples/${accession}/lookup`)
  }
}

export default new BioSampleService()
