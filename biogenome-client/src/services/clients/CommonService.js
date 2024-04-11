import http from '../../http-axios'

const base = http.base

class CommonService {
  getItems(path, params) {
    return base.get(path, { params: params })
  }
  getItem(path) {
    return base.get(path)
  }
}

export default new CommonService()
