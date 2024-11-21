import { DataModels } from '../data/types'
import { base } from '../http-axios'



class StatsService {
  getModelFieldStats(model: DataModels, field: string, query: Record<string, any>) {
    return base.get(`/stats/${model}/${field}`, { params: query })
  }
}

export default new StatsService()
