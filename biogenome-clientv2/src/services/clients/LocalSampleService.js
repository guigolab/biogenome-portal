import http from '../../http-axios'

const base = http.base

class LocalSampleService {
  getLocalSamples(params) {
    return base.get('/local_samples', { params: params })
  }
  getLocalSample(local_id) {
    return base.get(`/local_samples/${local_id}`)
  }
  updateLocalSample(local_id, data) {
    return base.put(`/local_samples/${local_id}`, data)
  }
  deleteLocalSample(local_id) {
    return base.delete(`/local_samples/${local_id}`)
  }
}

export default new LocalSampleService()
