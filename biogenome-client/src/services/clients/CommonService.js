import http from '../../http-axios'

const {base, download} = http

class CommonService {
  getItems(path, params) {
    return base.get(path, { params: params })
  }
  getItem(path) {
    return base.get(path)
  }
  getTsv(path, params) {
    return download.get(path, { params: params })
  }
}

export default new CommonService()
