import http from '../../http-axios'

const base = http.base

class AnnotationService {
  getAnnotations(params) {
    return base.get('/annotations', { params: params })
  }
  getAnnotation(name) {
    return base.get(`/annotations/${name}`)
  }
  createAnnotation(formData) {
    return base.post('/annotations', formData)
  }
  updateAnnotation(name, formData) {
    return base.put(`/annotations/${name}`, formData)
  }
  deleteAnnotation(name) {
    return base.delete(`/annotations/${name}`)
  }
}

export default new AnnotationService()
