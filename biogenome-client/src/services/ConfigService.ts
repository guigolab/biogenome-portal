import { base } from '../http-axios'


class ConfigService {
  getConfig() {
    return base.get('/configs')
  }
}

export default new ConfigService()
