import { DataModels } from '../data/types'
import { base } from '../http-axios'


class OrganismService {
  getOrganisms(params: Record<string, any>) {
    return base.get('/organisms', {
      params: params,
    })
  }

  getOrganismsLocations(params: Record<string, any>) {
    return base.get('/organisms/locations', {
      params: params,
    })
  }
  getOrganism(taxid: string) {
    return base.get(`/organisms/${taxid}`)
  }

  getOrganismLineage(taxid: string) {
    return base.get(`/organisms/${taxid}/lineage`)
  }


  lookupData(taxid: string) {
    return base.get(`/organisms/${taxid}/lookup`)

  }

  getOrganismRelatedData(taxid: string, model: DataModels) {
    return base.get(`/organisms/${taxid}/${model}`)
  }

}

export default new OrganismService()
