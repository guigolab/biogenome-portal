import { base } from '../http-axios'

class ExperimentService {
  getReadsByExperiment(accession: string) {
    return base.get(`/experiments/${accession}/reads`)
  }
}

export default new ExperimentService()
