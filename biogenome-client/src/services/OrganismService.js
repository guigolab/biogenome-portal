import http from "../http-axios"

const base = http.base

const submission = http.submission

class OrganismService {

    getOrganisms(params){
        return base.get('/organisms', {params:params})
    }

    getOrganism(taxid){
        return base.get(`/organisms/${taxid}`)
    }

    createOrganism(formData){
        return submission.post('/organisms', formData)
    }

    updateOrganism(taxid,formData){
        return submission.put(`/organisms/${taxid}`,formData)
    }

    deleteOrganism(taxid){
        return submission.delete(`/organisms/${taxid}`)
    }
}

export default new OrganismService();


  