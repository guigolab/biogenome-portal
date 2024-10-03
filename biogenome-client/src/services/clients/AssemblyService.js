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
  getAssemblyLookup(accession){
    return base.get(`/assemblies/${accession}/lookup`)
  }
  getRelatedChromosomes(accession){
    return base.get(`/assemblies/${accession}/chromosomes`)
  }
  getChrAliases(accession){
    return base.get(`/assemblies/${accession}/chr_aliases`)
  }
}

export default new AssemblyService()
