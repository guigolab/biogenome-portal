import http from '../../http-axios'

const base = http.base

class OrganismService {
  getOrganisms(params) {
    return base.get('/organisms', {
      params: params,
    })
  }

  getOrganismsLocations(params) {
    return base.get('/organisms/locations', {
      params: params,
    })
  }
  getOrganism(taxid) {
    return base.get(`/organisms/${taxid}`)
  }

  getOrganismLineage(taxid) {
    return base.get(`/organisms/${taxid}/lineage`)
  }


  lookupData(taxid){
    return base.get(`/organisms/${taxid}/lookup`)

  }

  getOrganismRelatedData(taxid, model) {
    return base.get(`/organisms/${taxid}/${model}`)
  }

}

export default new OrganismService()
