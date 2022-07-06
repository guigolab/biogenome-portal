import http from "../http-axios"

const base = http.base

const submission = http.submission

class AssemblyService {

    getAssemblies(params){
        return base.get('/assemblies', {params:params})
    }

    //create assembly by INSDC accession, expects assembly track fields
    importAssembly(accession, formData){
        return submission.post(`/assemblies/${accession}`, formData)
    }

    updateAssembly(accession, formData){
        return submission.put(`/assemblies/${accession}`, formData)
    }
    
    deleteAssembly(accession){
        return submission.delete(`/assemblies/${accession}`)
    }
}

export default new AssemblyService();


  