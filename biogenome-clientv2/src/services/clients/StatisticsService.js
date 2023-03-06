import http from '../../http-axios'

const base = http.base

class StatsService {
  getModelFieldStats(model, params) {
    return base.get(`/stats/${model}`, { params: params })
  }
}

export default new StatsService()
