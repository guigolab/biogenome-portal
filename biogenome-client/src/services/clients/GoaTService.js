import http from '../../http-axios'

const base = http.base
const download = http.download

class GoaTService {
  getGoatReport(params) {
    return download.get('/goat_report',{params:params})
  }
}

export default new GoaTService()
