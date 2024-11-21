import { download } from '../http-axios'

class GoaTService {
  getGoatReport() {
    return download.get('/goat_report')
  }
}

export default new GoaTService()
