import { base } from '../http-axios'

class LocalSampleService {
  getLocalSamples(params: Record<string, any>) {
    return base.get('/local_samples', { params: params })
  }
  getLocalSample(local_id: string) {
    return base.get(`/local_samples/${local_id}`)
  }
}

export default new LocalSampleService()
