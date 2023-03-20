import http from '../../http-axios'

const base = http.base

class AnnotationService {
  getAnnotations(params) {
    return base.get('/annotations', { params: params })
  }
  getAnnotation(name) {
    return base.get(`/annotations/${name}`)
  }
}

export default new AnnotationService()
