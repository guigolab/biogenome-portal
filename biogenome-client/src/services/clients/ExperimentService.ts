import { base } from '../http-axios'



class ExperimentService {
  getExperiments(params: Record<string, any>) {
    return base.get('/experiments', { params: params })
  }
  getExperiment(accession: string) {
    return base.get(`/experiments/${accession}`)
  }
  getReadsByExperiment(accession: string) {
    return base.get(`/experiments/${accession}/reads`)
  }
}

export default new ExperimentService()
