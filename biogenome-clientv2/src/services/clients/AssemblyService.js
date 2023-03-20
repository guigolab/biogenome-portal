import http from '../../http-axios'

const base = http.base

class AssemblyService {
  getAssemblies(params) {
    return base.get('/assemblies', { params: params })
  }
  getAssembly(accession) {
    return base.get(`/assemblies/${accession}`)
  }
  getRelatedAnnotations(accession){
    return base.get(`/assemblies/${accession}/annotations`)
  }
}

export default new AssemblyService()
