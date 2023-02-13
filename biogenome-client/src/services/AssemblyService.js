import http from "../http-axios"

const base = http.base

const submission = http.submission

class AssemblyService {

    getAssemblies(params){
        return base.get('/assemblies', {params:params})
    }
    getAssembly(accession){
        return base.get(`/assemblies/${accession}`)
    }
    //create assembly by INSDC accession
    importAssembly(accession){
        return submission.post(`/assemblies/${accession}`)
    }
    deleteAssembly(accession){
        return submission.delete(`/assemblies/${accession}`)
    }
}

export default new AssemblyService();


  