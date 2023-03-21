import http from '../../http-axios'

const base = http.base
const download = http.download

class GoaTService {
  getGoatReport(params) {
    return download.get('/goat_report',{params:params})
  }
  uploadGoatReport(formData) {
    return base.post('/goat_report', formData)
  }
}

export default new GoaTService()
