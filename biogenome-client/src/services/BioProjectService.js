import http from "../http-axios"

const base = http.base

class BioProjectService {

    getBioProjectChildren(accession){
        return base.get(`/bioprojects/${accession}`)
    }
}

export default new BioProjectService();


  