import { base } from '../http-axios'

class BioSampleService {
  getBioSampleRelatedData(accession: string, model: string) {
    return base.get(`/biosamples/${accession}/${model}`)
  }
  getENAChecklist(){
    return base.get('/biosamples/checklist')
  }
}

export default new BioSampleService()
