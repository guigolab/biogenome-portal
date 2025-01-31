import { base } from '../http-axios'

class AssemblyService {
  getAssemblies(params: Record<string, any>) {
    return base.get('/assemblies', { params: params })
  }
  getAssembly(accession:string) {
    return base.get(`/assemblies/${accession}`)
  }
  getRelatedAnnotations(accession:string) {
    return base.get(`/assemblies/${accession}/annotations`)
  }
  getAssemblyLookup(accession:string) {
    return base.get(`/assemblies/${accession}/lookup`)
  }
  getRelatedChromosomes(accession:string) {
    return base.get(`/assemblies/${accession}/chromosomes`)
  }
  getChrAliases(accession:string) {
    return base.get(`/assemblies/${accession}/chr_aliases`)
  }
  getAssembliesFromAnnotations(params: Record<string, any>) {
    return base.get('/assemblies/from_annotations', { params: params })
  }

}

export default new AssemblyService()
