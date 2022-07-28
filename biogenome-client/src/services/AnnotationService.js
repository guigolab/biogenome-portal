import http from "../http-axios"

const base = http.base

const submission = http.submission

class AnnotationService {

    getAnnotations(params){
        return base.get('/annotations', {params:params})
    }
    getAnnotation(name){
        return base.get(`/annotations/${name}`)
    }
    createAnnotation(formData){
        return submission.post('/annotations',formData)
    }

    updateAnnotation(name, formData){
        return submission.put(`/annotations/${name}`,formData)
    }
    
    deleteAnnotation(name){
        return submission.delete(`/annotations/${name}`)
    }

}

export default new AnnotationService();


  