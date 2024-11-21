import {base} from '../http-axios'

class LookupService {
  lookupData() {
    return base.get('/lookup')
  }
}

export default new LookupService()
