import { DataModels } from '../data/types'
import { base } from '../http-axios'


class OrganismService {

  getUnassignedOrganisms(params: Record<string, any>) {
    return base.get('/organisms/unassigned', {
      params: params,
    })
  }

  getOrganismRelatedData(taxid: string, model: DataModels) {
    return base.get(`/organisms/${taxid}/${model}`)
  }

}

export default new OrganismService()
