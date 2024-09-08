import http from '../../http-axios'

const base = http.base

class StatsService {
  getModelFieldStats(model, field, query) {
    return base.get(`/stats/${model}/${field}`, { params: query })
  }
}

export default new StatsService()
