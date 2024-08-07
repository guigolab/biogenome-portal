import http from '../../http-axios'

const base = http.base

class StatsService {
  getModelFieldStats(model, field) {
    return base.get(`/stats/${model}/${field}`)
  }
}

export default new StatsService()
