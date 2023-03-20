import http from '../../http-axios'

const base = http.base

class ReadsService {
  getReads(params) {
    return base.get('/reads', { params: params })
  }
  getRead(accession) {
    return base.get(`/reads/${accession}`)
  }
}

export default new ReadsService()
