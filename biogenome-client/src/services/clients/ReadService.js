import http from '../../http-axios'

const base = http.base

class ReadsService {
  getReads(params) {
    return base.get('/experiments', { params: params })
  }
  getRead(accession) {
    return base.get(`/experiments/${accession}`)
  }
}

export default new ReadsService()
