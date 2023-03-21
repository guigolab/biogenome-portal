import http from '../../http-axios'

const base = http.base

class CoordinatesService {
  getCoordinates(params) {
    return base.get('/coordinates/node', { params: params })
  }
}

export default new CoordinatesService()
