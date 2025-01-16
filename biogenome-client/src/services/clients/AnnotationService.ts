import { base } from '../http-axios'


class AnnotationService {
  getAnnotations(params: Record<string, any>) {
    return base.get('/annotations', { params: params })
  }
  getAnnotation(name: string) {
    return base.get(`/annotations/${name}`)
  }
}

export default new AnnotationService()
