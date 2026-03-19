import { base } from '../http-axios'

/** Read runs (INSDC) — `/api/reads` */
class ReadService {
   getReadRunsByExperiment(experimentAccession: string) {
      return base.get(`/reads/by-experiment/${experimentAccession}`)
   }
}

export default new ReadService()
