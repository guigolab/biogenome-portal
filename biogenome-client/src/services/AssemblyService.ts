import { base } from '../http-axios'

class AssemblyService {

  getRelatedAnnotations(accession:string) {
    return base.get(`/assemblies/${accession}/annotations`)
  }

  getRelatedChromosomes(accession:string) {
    return base.get(`/assemblies/${accession}/chromosomes`)
  }

  getAssembliesFromAnnotations(params: Record<string, any>) {
    return base.get('/assemblies/from_annotations', { params: params })
  }

}

export default new AssemblyService()
