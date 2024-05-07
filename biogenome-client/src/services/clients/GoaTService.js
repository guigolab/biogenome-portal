import http from '../../http-axios'

const download = http.download

class GoaTService {
  getGoatReport() {
    return download.get('/goat_report')
  }
}

export default new GoaTService()
