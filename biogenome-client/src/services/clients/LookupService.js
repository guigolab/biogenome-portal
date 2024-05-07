import http from '../../http-axios'

const base = http.base

class LookupService {
  lookupData() {
    return base.get('/lookup')
  }
}

export default new LookupService()
