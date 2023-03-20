import http from '../../http-axios'

const base = http.base

class LocalSampleService {
  getLocalSamples(params) {
    return base.get('/local_samples', { params: params })
  }
  getLocalSample(local_id) {
    return base.get(`/local_samples/${local_id}`)
  }
}

export default new LocalSampleService()
