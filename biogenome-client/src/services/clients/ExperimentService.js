import http from '../../http-axios'

const base = http.base

class ExperimentService {
  getExperiments(params) {
    return base.get('/experiments', { params: params })
  }
  getExperiment(accession) {
    return base.get(`/experiments/${accession}`)
  }
  getReadsByExperiment(accession){
    return base.get(`/experiments/${accession}/reads`)
  }
}

export default new ExperimentService()
