import http from "../http-axios"

const base = http.base

const submission = http.submission

class ReadsService {

    getReads(params){
        return base.get('/reads', {params:params})
    }
    getRead(accession){
        return base.get(`/reads/${accession}`)
    }
    //create reads by INSDC accession
    importReads(accession){
        return submission.post(`/reads/${accession}`)
    }
    
    deleteReads(accession){
        return submission.delete(`/reads/${accession}`)
    }

}

export default new ReadsService();


  