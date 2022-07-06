import http from "../http-axios"

const base = http.base

const submission = http.submission

class LocalSampleService {

    getLocalSamples(params){
        return base.get('/local_samples', {params:params})
    }

    importLocalSamplesFromExcel(formData){
        return submission.post('/local_samples', formData)
    }

    editLocalSample(id,formData){
        return submission.put(`/local_samples/${id}`,formData)
    }
    
    deleteLocalSample(id){
        return submission.delete(`/local_samples/${id}`)
    }

}

export default new LocalSampleService();


  