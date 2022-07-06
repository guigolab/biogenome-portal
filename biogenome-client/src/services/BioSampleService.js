import http from "../http-axios"

const base = http.base

const submission = http.submission

class BioSampleService {

    getBioSamples(params){
        return base.get('/biosamples', {params:params})
    }
    //create biosample by INSDC accession, creation is managed back end.. no edit options
    importBioSample(accession){
        return submission.post(`/biosamples/${accession}`)
    }
    
    deleteBioSample(accession){
        return submission.delete(`/biosamples/${accession}`)
    }

}

export default new BioSampleService();


  