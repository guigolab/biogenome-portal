import http from '../../http-axios'

const base = http.base

class GoaTService {
  getGoatReport(params) {
    return base.get('/goat_report')
  }
  uploadGoatReport(formData) {
    return base.post('/goat_report', formData)
  }
}

export default new GoaTService()
